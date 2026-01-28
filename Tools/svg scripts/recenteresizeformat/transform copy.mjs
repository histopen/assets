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
const SOURCE_DIR = join(__dirname, 'source');
const TARGET_DIR = join(__dirname, 'target');

// Target box dimensions (2:1 aspect ratio)
const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 200;

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
 * Check if an element is inside a <defs> element
 */
function isInsideDefs($, el) {
  let node = el;
  while (node) {
    if (node.name === 'defs') return true;
    node = node.parent;
  }
  return false;
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

  // Copy files to target first
  console.log('\n📁 Copying files to target/...\n');
  for (const file of files) {
    const content = await fs.readFile(join(SOURCE_DIR, file), 'utf-8');
    await fs.writeFile(join(TARGET_DIR, file), content);
  }

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
