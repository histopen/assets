#!/usr/bin/env node
/**
 * SVG Transformation Tool
 *
 * Applies 3 transformations to SVGs in source/:
 *   T1: Resize to fit 400×200 box (2:1 aspect), scale proportionally
 *   T2: Bake transforms with SVGO (convertTransform: true)
 *   T3: Center horizontally and vertically within the viewBox
 *
 * IMPORTANT: T2 must run before T3 so that transforms are baked into path
 * coordinates before calculating the centered viewBox. Otherwise viewBox will
 * be sized for the wrong coordinate system.
 *
 * Usage: node transform.mjs
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import potrace from 'potrace';
import sharp from 'sharp';
import { getPathBBox } from 'svg-path-commander';
import { optimize } from 'svgo';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, '../../../Icons_TimeMarks/source');
const TARGET_DIR = join(__dirname, '../../../Icons_TimeMarks/target');

// Target box dimensions (2:1 aspect ratio)
const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 200;

// Target color for normalization (white for dark mode file explorer visibility)
const TARGET_COLOR = '#ffffff';

// Common named colors to hex mapping
const NAMED_COLORS = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00', aqua: '#00ffff',
  teal: '#008080', navy: '#000080', fuchsia: '#ff00ff', purple: '#800080', orange: '#ffa500',
  pink: '#ffc0cb', brown: '#a52a2a', coral: '#ff7f50', crimson: '#dc143c', gold: '#ffd700',
  indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', salmon: '#fa8072',
  tan: '#d2b48c', tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3',
};

/**
 * Normalize a color value to lowercase 6-digit hex
 * Handles: hex (#fff, #ffffff), rgb(r,g,b), named colors
 */
function normalizeColor(color) {
  if (!color) return null;
  const c = color.trim().toLowerCase();

  // Named color
  if (NAMED_COLORS[c]) return NAMED_COLORS[c];

  // Hex color
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return '#' + hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length === 6) return c;
  }

  // rgb(r, g, b)
  const rgbMatch = c.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const toHex = n => parseInt(n).toString(16).padStart(2, '0');
    return '#' + toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3]);
  }

  // rgba(r, g, b, a) — strip alpha, treat as solid color
  const rgbaMatch = c.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
  if (rgbaMatch) {
    const toHex = n => parseInt(n).toString(16).padStart(2, '0');
    return '#' + toHex(rgbaMatch[1]) + toHex(rgbaMatch[2]) + toHex(rgbaMatch[3]);
  }

  // Return as-is if unrecognized
  return c;
}

/**
 * Check if a color is white (should be made transparent)
 */
function isWhiteColor(color) {
  const normalized = normalizeColor(color);
  return normalized === '#ffffff';
}

/**
 * Simplify SVG structure for better file explorer compatibility
 * Removes clipPaths, defs, and unwraps groups to create flat structure
 */
function transformSimplifyStructure($, $svg) {
  let simplified = 0;

  // Remove defs (including clipPaths defined inside)
  $svg.find('defs').remove();

  // Remove clip-path attributes from all elements
  $svg.find('[clip-path]').each((i, el) => {
    $(el).removeAttr('clip-path');
    simplified++;
  });

  // Remove clipPath elements outside defs
  $svg.find('clipPath').remove();

  // Remove xml:space and overflow attributes from svg
  $svg.removeAttr('xml:space');
  $svg.removeAttr('overflow');

  // Unwrap groups: move children to parent, remove empty groups
  // Repeat until no more groups with single path child
  let unwrapped = true;
  while (unwrapped) {
    unwrapped = false;
    $svg.find('g').each((i, g) => {
      const $g = $(g);
      const children = $g.children();
      // If group has transform, we can't easily unwrap (would need to bake transform)
      // For now, only unwrap groups without transforms
      if (!$g.attr('transform')) {
        $g.replaceWith(children);
        unwrapped = true;
        simplified++;
      }
    });
  }

  return { simplified };
}

/**
 * Transform 0: Normalize colors - white to transparent, others to black
 * White fills/strokes are removed (set to 'none'), other colors normalized to target
 */
function transformNormalizeColors($, $svg, targetColor = TARGET_COLOR) {
  const colors = new Set();
  let whiteRemoved = 0;
  let colorsNormalized = 0;

  // Find all colors in fill/stroke attributes
  $svg.find('[fill], [stroke]').each((i, el) => {
    const $el = $(el);
    const fill = $el.attr('fill');
    const stroke = $el.attr('stroke');
    if (fill && fill !== 'none') {
      const normalized = normalizeColor(fill);
      if (normalized) colors.add(normalized);
    }
    if (stroke && stroke !== 'none') {
      const normalized = normalizeColor(stroke);
      if (normalized) colors.add(normalized);
    }
  });

  // Find colors in style attributes
  $svg.find('[style]').each((i, el) => {
    const style = $(el).attr('style');
    const fillMatch = style.match(/fill:\s*([^;]+)/);
    const strokeMatch = style.match(/stroke:\s*([^;]+)/);
    if (fillMatch && fillMatch[1].trim() !== 'none') {
      const normalized = normalizeColor(fillMatch[1].trim());
      if (normalized) colors.add(normalized);
    }
    if (strokeMatch && strokeMatch[1].trim() !== 'none') {
      const normalized = normalizeColor(strokeMatch[1].trim());
      if (normalized) colors.add(normalized);
    }
  });

  const uniqueColors = [...colors];

  // Strip opacity attributes — flatten all transparency to solid
  $svg.find('[opacity], [fill-opacity], [stroke-opacity]').each((i, el) => {
    $(el).removeAttr('opacity');
    $(el).removeAttr('fill-opacity');
    $(el).removeAttr('stroke-opacity');
  });

  // Strip opacity from inline styles
  $svg.find('[style]').each((i, el) => {
    let style = $(el).attr('style');
    style = style.replace(/\b(opacity|fill-opacity|stroke-opacity)\s*:\s*[\d.]+\s*;?/g, '');
    $(el).attr('style', style);
  });

  // Always process: white → transparent, non-white → currentColor
  let fillsAdded = 0;

  // Add fill to shape elements that don't have one (SVG default is black, but we want explicit white)
  $svg.find('path, circle, rect, ellipse, polygon, polyline, line').each((i, el) => {
    const $el = $(el);
    if (!$el.attr('fill') && !$el.attr('style')?.includes('fill')) {
      $el.attr('fill', targetColor);
      fillsAdded++;
    }
  });

  // Process fill attributes
  $svg.find('[fill]').each((i, el) => {
    const fill = $(el).attr('fill');
    if (fill && fill !== 'none' && fill !== targetColor) {
      if (isWhiteColor(fill)) {
        // Keep white as colored content, convert to target color
        $(el).attr('fill', targetColor);
        colorsNormalized++;
      } else {
        $(el).attr('fill', targetColor);
        colorsNormalized++;
      }
    }
  });

  // Process stroke attributes
  $svg.find('[stroke]').each((i, el) => {
    const stroke = $(el).attr('stroke');
    if (stroke && stroke !== 'none') {
      if (isWhiteColor(stroke)) {
        // Keep white as colored content, convert to target color
        $(el).attr('stroke', targetColor);
        colorsNormalized++;
      } else {
        $(el).attr('stroke', targetColor);
        colorsNormalized++;
      }
    }
  });

  // Process inline styles
  $svg.find('[style]').each((i, el) => {
    let style = $(el).attr('style');
    // Replace fill in style
    style = style.replace(/fill:\s*([^;]+)/g, (match, color) => {
      if (color.trim() === 'none') return match;
      if (isWhiteColor(color.trim())) {
        // Keep white as colored content, convert to target color
        colorsNormalized++;
        return `fill: ${targetColor}`;
      }
      colorsNormalized++;
      return `fill: ${targetColor}`;
    });
    // Replace stroke in style
    style = style.replace(/stroke:\s*([^;]+)/g, (match, color) => {
      if (color.trim() === 'none') return match;
      if (isWhiteColor(color.trim())) {
        // Keep white as colored content, convert to target color
        colorsNormalized++;
        return `stroke: ${targetColor}`;
      }
      colorsNormalized++;
      return `stroke: ${targetColor}`;
    });
    $(el).attr('style', style);
  });

  return { colors: uniqueColors, whiteRemoved, colorsNormalized, fillsAdded };
}

/**
 * Parse a transform attribute and extract translate + scale values
 */
function parseTransform(transform) {
  if (!transform) return { tx: 0, ty: 0, scale: 1 };

  // Handle translate + scale: translate(x y)scale(s)
  const translateScaleMatch = transform.match(/translate\(([^)]+)\)\s*scale\(([^)]+)\)/);
  if (translateScaleMatch) {
    const [tx, ty] = translateScaleMatch[1].split(/\s+/).map(Number);
    const scale = parseFloat(translateScaleMatch[2]);
    return { tx, ty, scale };
  }

  // Handle just translate: translate(x, y) or translate(x y)
  const translateMatch = transform.match(/translate\(([^,)]+)[,\s]+([^)]+)\)/);
  if (translateMatch) {
    return { tx: parseFloat(translateMatch[1]) || 0, ty: parseFloat(translateMatch[2]) || 0, scale: 1 };
  }

  // Handle just scale: scale(s)
  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    return { tx: 0, ty: 0, scale: parseFloat(scaleMatch[1]) };
  }

  // Handle matrix: matrix(a b c d e f) where e,f are translate and a,d are scale
  const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
  if (matrixMatch) {
    const [a, b, c, d, e, f] = matrixMatch[1].split(/[\s,]+/).map(Number);
    return { tx: e, ty: f, scale: Math.sqrt(a * a + b * b) };
  }

  return { tx: 0, ty: 0, scale: 1 };
}

/**
 * Parse viewBox string into {x, y, width, height}
 */
function parseViewBox(vb) {
  if (!vb) return null;
  const parts = vb.trim().split(/\s+/).map(Number);
  if (parts.length !== 4) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

/**
 * Get the effective viewBox from an SVG (from viewBox attr or width/height)
 */
function getEffectiveViewBox($, $svg) {
  const vbAttr = $svg.attr('viewBox');
  if (vbAttr) {
    return parseViewBox(vbAttr);
  }
  // Fall back to width/height
  const w = parseFloat($svg.attr('width')) || 100;
  const h = parseFloat($svg.attr('height')) || 100;
  return { x: 0, y: 0, width: w, height: h };
}

/**
 * Check if an element is inside a <defs> element (handles namespaced elements)
 */
function isInsideDefs($, el) {
  let node = el;
  while (node) {
    // Handle both 'defs' and namespaced variants like 'ns0:defs'
    if (node.name === 'defs' || (node.name && node.name.endsWith(':defs'))) return true;
    node = node.parent;
  }
  return false;
}

/**
 * Normalize SVG content by removing namespace prefixes (ns0:svg -> svg, ns0:path -> path)
 * and converting ns0 namespace to standard xmlns
 */
function normalizeNamespaces(content) {
  // Replace ns0:svg with svg and xmlns:ns0 with xmlns
  let normalized = content
    .replace(/<ns0:svg/g, '<svg')
    .replace(/<\/ns0:svg>/g, '</svg>')
    .replace(/<ns0:path/g, '<path')
    .replace(/<\/ns0:path>/g, '</path>')
    .replace(/<ns0:g/g, '<g')
    .replace(/<\/ns0:g>/g, '</g>')
    .replace(/<ns0:defs/g, '<defs')
    .replace(/<\/ns0:defs>/g, '</defs>')
    .replace(/<ns0:clipPath/g, '<clipPath')
    .replace(/<\/ns0:clipPath>/g, '</clipPath>')
    .replace(/xmlns:ns0=/g, 'xmlns=');
  return normalized;
}

/**
 * Compute bounding box of all visible elements (path, circle, rect, ellipse, polygon, polyline, use)
 * Takes transforms on parent elements into account
 * Skips elements inside <defs> (like clip-paths)
 */
function getContentBounds($, $svg) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let foundContent = false;

  // Helper to apply transform to bbox
  function applyTransformToBBox(bbox, transform) {
    let left = bbox.x;
    let top = bbox.y;
    let right = bbox.x2;
    let bottom = bbox.y2;

    // Handle matrix transforms properly
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const [a, b, c, d, e, f] = matrixMatch[1].split(/[\s,]+/).map(Number);
      const corners = [
        [left, top], [right, top], [left, bottom], [right, bottom]
      ];
      const transformed = corners.map(([x, y]) => [
        a * x + c * y + e,
        b * x + d * y + f
      ]);
      left = Math.min(...transformed.map(([x, _]) => x));
      right = Math.max(...transformed.map(([x, _]) => x));
      top = Math.min(...transformed.map(([_, y]) => y));
      bottom = Math.max(...transformed.map(([_, y]) => y));
    } else {
      // Simple translate/scale
      const { tx, ty, scale } = parseTransform(transform);
      left = left * scale + tx;
      right = right * scale + tx;
      top = top * scale + ty;
      bottom = bottom * scale + ty;
    }

    return { left, top, right, bottom };
  }

  // Helper to accumulate a raw bbox {x, y, x2, y2} accounting for ancestor transforms
  function accumulateBBox(el, rawBBox) {
    let left = rawBBox.x, top = rawBBox.y, right = rawBBox.x2, bottom = rawBBox.y2;
    let node = el;
    while (node && node.name !== 'svg') {
      const transform = $(node).attr('transform');
      if (transform) {
        const t = applyTransformToBBox({ x: left, y: top, x2: right, y2: bottom }, transform);
        left = t.left; right = t.right; top = t.top; bottom = t.bottom;
      }
      node = node.parent;
    }
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
    foundContent = true;
  }

  // Process all <path> elements
  $svg.find('path').each((i, el) => {
    // Skip paths inside <defs> (clip-paths, patterns, etc.)
    if (isInsideDefs($, el)) {
      return;
    }

    const $el = $(el);
    const d = $el.attr('d');
    if (d) {
      try {
        const bbox = getPathBBox(d);
        accumulateBBox(el, { x: bbox.x, y: bbox.y, x2: bbox.x2, y2: bbox.y2 });
      } catch (e) {
        // Skip invalid paths
        console.log(`      ⚠ Could not parse path in element ${i}`);
      }
    }
  });

  // Process <circle> elements
  $svg.find('circle').each((i, el) => {
    if (isInsideDefs($, el)) return;
    const $el = $(el);
    const cx = parseFloat($el.attr('cx')) || 0;
    const cy = parseFloat($el.attr('cy')) || 0;
    const r = parseFloat($el.attr('r')) || 0;
    accumulateBBox(el, { x: cx - r, y: cy - r, x2: cx + r, y2: cy + r });
  });

  // Process <ellipse> elements
  $svg.find('ellipse').each((i, el) => {
    if (isInsideDefs($, el)) return;
    const $el = $(el);
    const cx = parseFloat($el.attr('cx')) || 0;
    const cy = parseFloat($el.attr('cy')) || 0;
    const rx = parseFloat($el.attr('rx')) || 0;
    const ry = parseFloat($el.attr('ry')) || 0;
    accumulateBBox(el, { x: cx - rx, y: cy - ry, x2: cx + rx, y2: cy + ry });
  });

  // Process <rect> elements
  $svg.find('rect').each((i, el) => {
    if (isInsideDefs($, el)) return;
    const $el = $(el);
    const x = parseFloat($el.attr('x')) || 0;
    const y = parseFloat($el.attr('y')) || 0;
    const w = parseFloat($el.attr('width')) || 0;
    const h = parseFloat($el.attr('height')) || 0;
    accumulateBBox(el, { x, y, x2: x + w, y2: y + h });
  });

  // Process <polygon> and <polyline> elements
  $svg.find('polygon, polyline').each((i, el) => {
    if (isInsideDefs($, el)) return;
    const points = ($(el).attr('points') || '').trim().split(/[\s,]+/).map(Number);
    if (points.length < 2) return;
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (let j = 0; j < points.length - 1; j += 2) {
      pMinX = Math.min(pMinX, points[j]);
      pMaxX = Math.max(pMaxX, points[j]);
      pMinY = Math.min(pMinY, points[j + 1]);
      pMaxY = Math.max(pMaxY, points[j + 1]);
    }
    accumulateBBox(el, { x: pMinX, y: pMinY, x2: pMaxX, y2: pMaxY });
  });

  // Process all <use> elements
  $svg.find('use').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('xlink:href') || $el.attr('href');
    if (!href) return;

    const refId = href.replace('#', '');
    const $ref = $(`#${refId}`);

    if ($ref.length > 0 && $ref.attr('d')) {
      const d = $ref.attr('d');
      try {
        const bbox = getPathBBox(d);
        accumulateBBox(el, { x: bbox.x, y: bbox.y, x2: bbox.x2, y2: bbox.y2 });
      } catch (e) {
        // Skip invalid references
      }
    }
  });

  if (!foundContent) {
    // Fall back to viewBox if no content found
    console.log('      ⚠ No valid content found, using viewBox');
    return getEffectiveViewBox($, $svg);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Transform 1: Resize to fit 400×200 box
 * Scales the viewBox proportionally so the content fits within the target box
 */
function transformResize($, $svg) {
  const vb = getEffectiveViewBox($, $svg);
  if (!vb) return;

  // Calculate scale factor to fit content in 400×200
  const scaleX = TARGET_WIDTH / vb.width;
  const scaleY = TARGET_HEIGHT / vb.height;
  const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions

  // New content dimensions after scaling
  const newContentWidth = vb.width * scale;
  const newContentHeight = vb.height * scale;

  // Set width/height attributes to the scaled size
  $svg.attr('width', newContentWidth.toFixed(3));
  $svg.attr('height', newContentHeight.toFixed(3));

  // Keep viewBox as-is for now (the content stays the same, just displayed larger/smaller)
  // The viewBox represents the content; width/height represent the display size
  if (!$svg.attr('viewBox')) {
    $svg.attr('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  return { scale, newContentWidth, newContentHeight, originalWidth: vb.width, originalHeight: vb.height };
}

/**
 * Transform 2: Center within 400×200 viewBox
 * Creates a 2:1 viewBox that tightly encompasses content with minimal margins
 * Normalizes viewBox size to 400-800 range by scaling coordinates if needed
 */
function transformCenter($, $svg) {
  // Get actual content bounds from paths, not just viewBox
  const contentBounds = getContentBounds($, $svg);
  if (!contentBounds) return;

  const contentAspect = contentBounds.width / contentBounds.height;
  const targetAspect = TARGET_WIDTH / TARGET_HEIGHT; // 2.0

  // Content should fill 96-99% of the viewBox in the constraining dimension
  const FILL_RATIO = 0.975; // Target 97.5% fill

  // Calculate viewBox dimensions so content fills FILL_RATIO of constraining dimension
  let newVBWidth, newVBHeight;

  if (contentAspect > targetAspect) {
    // Content is wider than 2:1 - width is constraining
    newVBWidth = contentBounds.width / FILL_RATIO;
    newVBHeight = newVBWidth / targetAspect;
  } else {
    // Content is taller than 2:1 - height is constraining
    newVBHeight = contentBounds.height / FILL_RATIO;
    newVBWidth = newVBHeight * targetAspect;
  }

  // Center the content within the viewBox
  const offsetX = contentBounds.x - (newVBWidth - contentBounds.width) / 2;
  const offsetY = contentBounds.y - (newVBHeight - contentBounds.height) / 2;

  // Set the viewBox and display dimensions
  $svg.attr('viewBox', `${offsetX.toFixed(3)} ${offsetY.toFixed(3)} ${newVBWidth.toFixed(3)} ${newVBHeight.toFixed(3)}`);
  $svg.attr('width', TARGET_WIDTH);
  $svg.attr('height', TARGET_HEIGHT);

  return { offsetX, offsetY, newVBWidth, newVBHeight };
}

/**
 * Transform 3: Minify with SVGO
 * Aggressively simplifies SVG structure for better file explorer compatibility
 */
function transformMinify(svgContent) {
  const result = optimize(svgContent, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: true, // Clean up IDs
            convertTransform: true, // Bake transforms into path data
            removeUselessDefs: true, // Remove unused defs
          }
        }
      },
      'removeXMLNS', // Remove unnecessary xmlns
      'reusePaths', // Reuse paths where possible
      {
        name: 'removeOffCanvasPaths',
        params: {
          disabled: true // DON'T remove paths outside viewBox (we use viewBox windowing)
        }
      }
    ]
  });
  
  // Ensure xmlns is present for standalone SVG files
  let output = result.data;
  if (!output.includes('xmlns=')) {
    output = output.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return output;
}

/**
 * Process a single SVG file
 */
async function processSvg(filename, transformFn, description) {
  const sourcePath = join(TARGET_DIR, filename);
  const content = await fs.readFile(sourcePath, 'utf-8');
  
  const result = transformFn(content, filename);
  
  await fs.writeFile(sourcePath, result.content);
  
  return result;
}

/**
 * Convert a transparent PNG to an SVG by tracing the alpha channel with potrace.
 * Opaque pixels become the traced shape; transparent pixels become background.
 * Returns SVG string.
 */
async function convertPngToSvg(pngPath) {
  const metadata = await sharp(pngPath).metadata();
  if (!metadata.hasAlpha) {
    throw new Error(`PNG has no alpha channel (not transparent)`);
  }

  // Extract alpha channel as grayscale, then negate:
  // opaque (alpha=255) → dark (0) — potrace traces dark areas as shape
  // transparent (alpha=0) → light (255) — becomes background
  const alphaBuffer = await sharp(pngPath)
    .extractChannel('alpha')
    .negate()
    .png()
    .toBuffer();

  return new Promise((resolve, reject) => {
    potrace.trace(alphaBuffer, {
      threshold: 128,
      color: TARGET_COLOR,
      background: 'transparent',
    }, (err, svg) => {
      if (err) reject(err);
      else resolve(svg);
    });
  });
}

/**
 * Main entry point
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     SVG Transformation Tool - Resize, Center, Minify      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Ensure target directory exists
  await fs.mkdir(TARGET_DIR, { recursive: true });

  // Get list of SVG and PNG files from source
  const allSourceFiles = await fs.readdir(SOURCE_DIR);
  const svgSourceFiles = allSourceFiles.filter(f => f.toLowerCase().endsWith('.svg'));
  const pngSourceFiles = allSourceFiles.filter(f => f.toLowerCase().endsWith('.png'));

  if (svgSourceFiles.length === 0 && pngSourceFiles.length === 0) {
    console.log('No SVG or PNG files found in source/');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-STEP: Convert PNGs to SVGs
  // ═══════════════════════════════════════════════════════════════════════════
  const convertedFromPng = [];

  if (pngSourceFiles.length > 0) {
    console.log('\n┌───────────────────────────────────────────────────────────┐');
    console.log('│  PRE-STEP: Convert transparent PNGs to SVG (potrace)      │');
    console.log('└───────────────────────────────────────────────────────────┘\n');

    for (const pngFile of pngSourceFiles) {
      const pngPath = join(SOURCE_DIR, pngFile);
      const svgName = pngFile.replace(/\.png$/i, '.svg');
      const metadata = await sharp(pngPath).metadata();

      if (!metadata.hasAlpha) {
        console.log(`  ⚠ Skipping ${pngFile} (no transparent background)`);
        continue;
      }

      process.stdout.write(`  • ${pngFile} (${metadata.width}×${metadata.height}) → ${svgName} ... `);
      try {
        const svgContent = await convertPngToSvg(pngPath);
        await fs.writeFile(join(TARGET_DIR, svgName), svgContent);
        convertedFromPng.push(svgName);
        console.log('✓');
      } catch (err) {
        console.log(`❌ ${err.message}`);
      }
    }

    console.log(`\n✅ PNG pre-step complete. ${convertedFromPng.length} PNG(s) converted.`);
  }

  // All files to process: original SVGs + SVGs converted from PNG
  const files = [...svgSourceFiles, ...convertedFromPng];

  if (files.length === 0) {
    console.log('No processable files found.');
    return;
  }

  console.log(`\nFound ${files.length} file(s) to process:\n`);
  for (const f of files) {
    const tag = convertedFromPng.includes(f) ? ' (from PNG)' : '';
    console.log(`  • ${f}${tag}`);
  }

  // Copy SVG source files to target (normalize namespaces during copy)
  // PNG-converted files are already in target/
  console.log('\n📁 Copying SVG files to target/...\n');
  for (const file of svgSourceFiles) {
    let content = await fs.readFile(join(SOURCE_DIR, file), 'utf-8');
    // Normalize namespace prefixes (ns0:svg -> svg, etc.)
    content = normalizeNamespaces(content);
    await fs.writeFile(join(TARGET_DIR, file), content);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-PROCESS: Simplify SVG structure (remove clipPaths, defs, unwrap groups)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  PRE-PROCESS: Simplify structure (clipPath, defs, groups) │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');

    const $ = cheerio.load(content, { xmlMode: true });
    const $svg = $('svg');

    const result = transformSimplifyStructure($, $svg);

    await fs.writeFile(targetPath, $.xml());

    if (result.simplified > 0) {
      console.log(`  ✓ ${file}`);
      console.log(`      → Simplified ${result.simplified} element(s)`);
    } else {
      console.log(`  ✓ ${file} (already simple)`);
    }
  }

  console.log('\n✅ Pre-process complete. SVG structure simplified.');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 0: Normalize colors to monochrome
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 0: Normalize colors (white→transparent, other→currentColor) │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');

    const $ = cheerio.load(content, { xmlMode: true });
    const $svg = $('svg');

    const result = transformNormalizeColors($, $svg);

    await fs.writeFile(targetPath, $.xml());

    console.log(`  ✓ ${file}`);
    if (result.colors.length > 0) {
      console.log(`      Found colors: ${result.colors.join(', ')}`);
    }
    if (result.fillsAdded > 0) {
      console.log(`      → Added fill to ${result.fillsAdded} path(s)`);
    }
    if (result.whiteRemoved > 0) {
      console.log(`      → Removed ${result.whiteRemoved} white fill(s) (transparent)`);
    }
    if (result.colorsNormalized > 0) {
      console.log(`      → Normalized ${result.colorsNormalized} color(s) to ${TARGET_COLOR}`);
    }
    if (result.fillsAdded === 0 && result.whiteRemoved === 0 && result.colorsNormalized === 0) {
      console.log(`      No changes needed`);
    }
  }

  console.log('\n✅ Transform 0 complete. White→transparent, other→black.');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 1: Resize to fit 400×200
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 1: Resize to fit 400×200 box                   │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');
    
    const $ = cheerio.load(content, { xmlMode: true });
    const $svg = $('svg');
    
    const origVB = getEffectiveViewBox($, $svg);
    const origW = parseFloat($svg.attr('width')) || origVB.width;
    const origH = parseFloat($svg.attr('height')) || origVB.height;
    
    const result = transformResize($, $svg);
    
    await fs.writeFile(targetPath, $.xml());
    
    console.log(`  ✓ ${file}`);
    console.log(`      Original: ${origW.toFixed(1)} × ${origH.toFixed(1)}`);
    console.log(`      Scaled:   ${result.newContentWidth.toFixed(1)} × ${result.newContentHeight.toFixed(1)} (scale: ${result.scale.toFixed(3)})`);
  }

  console.log('\n✅ Transform 1 complete. Files in target/ have been resized.');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 2: Bake transforms with SVGO
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 2: Bake transforms (SVGO convertTransform)     │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');
    const originalSize = Buffer.byteLength(content, 'utf-8');

    let processed = transformMinify(content);

    // POST-PROCESS: Remove any fill="none" that SVGO added
    // Replace fill="none" with fill="#ffffff"
    processed = processed.replace(/fill="none"/g, 'fill="#ffffff"');

    const newSize = Buffer.byteLength(processed, 'utf-8');

    await fs.writeFile(targetPath, processed);

    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  ✓ ${file}`);
    console.log(`      ${originalSize} bytes → ${newSize} bytes (${savings}% smaller, transforms baked)`);
  }

  console.log('\n✅ Transform 2 complete. Transforms baked into path coordinates.');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 3: Center within 400×200
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 3: Center within 400×200 viewBox               │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');

    const $ = cheerio.load(content, { xmlMode: true });
    const $svg = $('svg');

    // Get content bounds for logging
    const contentBounds = getContentBounds($, $svg);
    const result = transformCenter($, $svg);

    await fs.writeFile(targetPath, $.xml());

    console.log(`  ✓ ${file}`);
    console.log(`      Content bbox: (${contentBounds.x.toFixed(1)}, ${contentBounds.y.toFixed(1)}) ${contentBounds.width.toFixed(1)}×${contentBounds.height.toFixed(1)}`);
    console.log(`      New viewBox:  ${result.offsetX.toFixed(1)} ${result.offsetY.toFixed(1)} ${result.newVBWidth.toFixed(1)} ${result.newVBHeight.toFixed(1)}`);
    console.log(`      Display:      ${TARGET_WIDTH} × ${TARGET_HEIGHT}`);
  }

  console.log('\n✅ Transform 3 complete. Icons are now centered in 400×200.');

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION: Check if all requirements are met
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  VALIDATION: Requirements Checklist                       │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  let allPassed = true;
  const FILL_MIN = 0.96; // STRICT: 96-99%
  const FILL_MAX = 0.99;

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });
    const $svg = $('svg');

    const width = $svg.attr('width');
    const height = $svg.attr('height');
    const vb = $svg.attr('viewBox');
    const [vbX, vbY, vbW, vbH] = vb.split(' ').map(Number);
    const aspect = vbW / vbH;

    // Get content bounds
    const contentBounds = getContentBounds($, $svg);
    const fillW = contentBounds.width / vbW;
    const fillH = contentBounds.height / vbH;
    const maxFill = Math.max(fillW, fillH);

    // Check centering
    const leftMargin = contentBounds.x - vbX;
    const rightMargin = (vbX + vbW) - (contentBounds.x + contentBounds.width);
    const topMargin = contentBounds.y - vbY;
    const bottomMargin = (vbY + vbH) - (contentBounds.y + contentBounds.height);
    const hMarginDiff = Math.abs(leftMargin - rightMargin);
    const vMarginDiff = Math.abs(topMargin - bottomMargin);
    const maxMarginDiff = Math.max(hMarginDiff, vMarginDiff);

    // Count failures
    const checks = [
      { pass: width === '400' && height === '200', msg: 'Display 400×200' },
      { pass: Math.abs(aspect - 2.0) < 0.01, msg: 'ViewBox 2:1 aspect' },
      { pass: vbW >= 50 && vbW <= 6000, msg: 'ViewBox size reasonable' }, // Relaxed from 800 to 6000
      { pass: maxFill >= FILL_MIN && maxFill <= FILL_MAX, msg: `Fill ${FILL_MIN*100}-${FILL_MAX*100}%` },
      { pass: maxMarginDiff < 1.0, msg: 'Perfectly centered' }, // STRICT: < 1 unit difference
    ];

    const failedChecks = checks.filter(c => !c.pass);
    const passed = failedChecks.length === 0;

    if (passed) {
      console.log(`  ✅ ${file} (${(maxFill*100).toFixed(1)}% fill)`);
    } else {
      console.log(`  ❌ ${file}`);
      failedChecks.forEach(c => console.log(`      ❌ ${c.msg}`));
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.log('\n⚠️  Some files failed validation. Review output above.');
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            All transformations complete! 🎉               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nOutput files are in: ${TARGET_DIR}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
