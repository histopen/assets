#!/usr/bin/env node
/**
 * SVG Transformation Tool
 * 
 * Applies 3 transformations to SVGs in source/:
 *   T1: Resize to fit 400×200 box (2:1 aspect), scale proportionally
 *   T2: Center horizontally and vertically within the viewBox
 *   T3: Minify with SVGO
 * 
 * Pauses after each transformation for user confirmation.
 * 
 * Usage: node transform.mjs
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { getPathBBox } from 'svg-path-commander';
import { optimize } from 'svgo';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, '../../../Icons_TimeMarks/source');
const TARGET_DIR = join(__dirname, '../../../Icons_TimeMarks/target');

// Target box dimensions (2:1 aspect ratio)
const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 200;

// Target color for normalization
const TARGET_COLOR = '#000000';

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

  // Always process: white → transparent, non-white → black
  // Process fill attributes
  $svg.find('[fill]').each((i, el) => {
    const fill = $(el).attr('fill');
    if (fill && fill !== 'none') {
      if (isWhiteColor(fill)) {
        $(el).attr('fill', 'none');
        whiteRemoved++;
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
        $(el).attr('stroke', 'none');
        whiteRemoved++;
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
        whiteRemoved++;
        return 'fill: none';
      }
      colorsNormalized++;
      return `fill: ${targetColor}`;
    });
    // Replace stroke in style
    style = style.replace(/stroke:\s*([^;]+)/g, (match, color) => {
      if (color.trim() === 'none') return match;
      if (isWhiteColor(color.trim())) {
        whiteRemoved++;
        return 'stroke: none';
      }
      colorsNormalized++;
      return `stroke: ${targetColor}`;
    });
    $(el).attr('style', style);
  });

  return { colors: uniqueColors, whiteRemoved, colorsNormalized };
}

/**
 * Parse a transform attribute and extract translate values
 */
function parseTransform(transform) {
  if (!transform) return { tx: 0, ty: 0 };
  const match = transform.match(/translate\(([^,]+)[,\s]+([^)]+)\)/);
  if (match) {
    return { tx: parseFloat(match[1]) || 0, ty: parseFloat(match[2]) || 0 };
  }
  return { tx: 0, ty: 0 };
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
 * Compute bounding box of all path elements using svg-path-bounds
 * Takes transforms on parent elements into account
 * Skips paths inside <defs> (like clip-paths)
 */
function getContentBounds($, $svg) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let foundPaths = false;

  $svg.find('path').each((i, el) => {
    // Skip paths inside <defs> (clip-paths, patterns, etc.)
    if (isInsideDefs($, el)) {
      return;
    }
    
    const $el = $(el);
    const d = $el.attr('d');
    if (d) {
      try {
        // Use svg-path-commander for accurate visual bounding box
        const bbox = getPathBBox(d);
        let left = bbox.x;
        let top = bbox.y;
        let right = bbox.x2;
        let bottom = bbox.y2;
        
        // Check for transforms on this element and parent elements
        let node = el;
        while (node && node.name !== 'svg') {
          const transform = $(node).attr('transform');
          if (transform) {
            const { tx, ty } = parseTransform(transform);
            left += tx;
            right += tx;
            top += ty;
            bottom += ty;
          }
          node = node.parent;
        }
        
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
        foundPaths = true;
      } catch (e) {
        // Skip invalid paths
        console.log(`      ⚠ Could not parse path in element ${i}`);
      }
    }
  });

  if (!foundPaths) {
    // Fall back to viewBox if no paths found
    console.log('      ⚠ No valid paths found, using viewBox');
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
 * Computes actual path bounding box and centers that within a 2:1 aspect viewBox
 */
function transformCenter($, $svg) {
  // Get actual content bounds from paths, not just viewBox
  const contentBounds = getContentBounds($, $svg);
  if (!contentBounds) return;

  // The actual content occupies contentBounds in viewBox coordinates
  // We need to create a new viewBox with 2:1 aspect ratio that centers this content
  
  const contentAspect = contentBounds.width / contentBounds.height;
  const targetAspect = TARGET_WIDTH / TARGET_HEIGHT; // 2.0
  
  let newVBWidth, newVBHeight;
  
  if (contentAspect > targetAspect) {
    // Content is wider than 2:1, expand height to add vertical margins
    newVBWidth = contentBounds.width;
    newVBHeight = contentBounds.width / targetAspect;
  } else {
    // Content is taller than 2:1, expand width to add horizontal margins
    newVBHeight = contentBounds.height;
    newVBWidth = contentBounds.height * targetAspect;
  }

  // Center the actual content within the new viewBox
  // Content center is at (contentBounds.x + contentBounds.width/2, contentBounds.y + contentBounds.height/2)
  // New viewBox should be positioned so this center is at the middle
  const contentCenterX = contentBounds.x + contentBounds.width / 2;
  const contentCenterY = contentBounds.y + contentBounds.height / 2;
  
  const offsetX = contentCenterX - newVBWidth / 2;
  const offsetY = contentCenterY - newVBHeight / 2;

  // Set the new viewBox (centered) and target dimensions
  $svg.attr('viewBox', `${offsetX.toFixed(3)} ${offsetY.toFixed(3)} ${newVBWidth.toFixed(3)} ${newVBHeight.toFixed(3)}`);
  $svg.attr('width', TARGET_WIDTH);
  $svg.attr('height', TARGET_HEIGHT);

  return { offsetX, offsetY, newVBWidth, newVBHeight };
}

/**
 * Transform 3: Minify with SVGO
 * Preserves xmlns for standalone SVG files
 */
function transformMinify(svgContent) {
  const result = optimize(svgContent, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: false, // Keep IDs for clip paths etc
          }
        }
      },
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
 * Main entry point
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     SVG Transformation Tool - Resize, Center, Minify      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Ensure target directory exists
  await fs.mkdir(TARGET_DIR, { recursive: true });

  // Get list of SVG files from source
  const files = (await fs.readdir(SOURCE_DIR)).filter(f => f.endsWith('.svg'));
  
  if (files.length === 0) {
    console.log('No SVG files found in source/');
    return;
  }

  console.log(`Found ${files.length} SVG file(s) in source/:\n`);
  for (const f of files) {
    console.log(`  • ${f}`);
  }

  // Copy files to target first (normalize namespaces during copy)
  console.log('\n📁 Copying files to target/...\n');
  for (const file of files) {
    let content = await fs.readFile(join(SOURCE_DIR, file), 'utf-8');
    // Normalize namespace prefixes (ns0:svg -> svg, etc.)
    content = normalizeNamespaces(content);
    await fs.writeFile(join(TARGET_DIR, file), content);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 0: Normalize colors to monochrome
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 0: Normalize colors (white→transparent, other→black) │');
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
    if (result.whiteRemoved > 0) {
      console.log(`      → Removed ${result.whiteRemoved} white fill(s) (transparent)`);
    }
    if (result.colorsNormalized > 0) {
      console.log(`      → Normalized ${result.colorsNormalized} color(s) to ${TARGET_COLOR}`);
    }
    if (result.whiteRemoved === 0 && result.colorsNormalized === 0) {
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
  // TRANSFORM 2: Center within 400×200
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 2: Center within 400×200 viewBox               │');
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

  console.log('\n✅ Transform 2 complete. Icons are now centered in 400×200.');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM 3: Minify with SVGO
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌───────────────────────────────────────────────────────────┐');
  console.log('│  TRANSFORM 3: Minify with SVGO                            │');
  console.log('└───────────────────────────────────────────────────────────┘\n');

  for (const file of files) {
    const targetPath = join(TARGET_DIR, file);
    const content = await fs.readFile(targetPath, 'utf-8');
    const originalSize = Buffer.byteLength(content, 'utf-8');
    
    const minified = transformMinify(content);
    const newSize = Buffer.byteLength(minified, 'utf-8');
    
    await fs.writeFile(targetPath, minified);
    
    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  ✓ ${file}`);
    console.log(`      ${originalSize} bytes → ${newSize} bytes (${savings}% smaller)`);
  }

  console.log('\n✅ Transform 3 complete. SVGs have been minified.');
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            All transformations complete! 🎉               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nOutput files are in: ${TARGET_DIR}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
