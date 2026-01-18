/**
 * Timeline Atlas Builder
 *
 * Converts SVG icons to texture atlases for PIXI.js
 * Generates 4 atlas sizes: 128x64, 96x48, 64x32, 32x16 (2:1 aspect ratio)
 * Output: timeline-atlas-{size}.png + timeline-atlas-{size}.json (PIXI spritesheet format)
 *
 * Usage: node "Tools/Icons_TimeMarks scripts/buildIcons_TimeMarks.mjs"
 */

import { Resvg } from '@resvg/resvg-js';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get next power of 2 >= n
 */
function nextPowerOf2(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Calculate optimal atlas dimensions for a given icon count and size
 * Returns { width, height } as powers of 2
 */
function calculateAtlasDimensions(iconCount, iconWidth, padding) {
  const iconHeight = iconWidth / 2;
  const paddedWidth = iconWidth + padding;
  const paddedHeight = iconHeight + padding;

  // Calculate optimal grid layout (favor wider than tall due to 2:1 icons)
  const iconsPerRow = Math.ceil(Math.sqrt(iconCount * 2));
  const rows = Math.ceil(iconCount / iconsPerRow);

  // Calculate minimum dimensions needed
  const minWidth = iconsPerRow * paddedWidth;
  const minHeight = rows * paddedHeight;

  // Round up to power of 2 for GPU efficiency
  const width = nextPowerOf2(minWidth);
  const height = nextPowerOf2(minHeight);

  return { width, height };
}

// Atlas sizes to generate (width, height = width/2)
const ATLAS_SIZES = [128, 96, 64, 32];

// Configuration
const CONFIG = {
  // Atlas dimensions (will be auto-calculated if 0)
  atlasWidth: 0,
  atlasHeight: 0,
  // Paths (relative to ghp/assets/)
  assetsDir: join(__dirname, '..', '..'),
  svgDir: 'Icons_TimeMarks/TM_Icons',
  iconMapPath: 'Icons_TimeMarks/Atlas/tMIconMap.json',
  outputDir: 'Icons_TimeMarks/Atlas',
};

// Track excluded files for final warning
const excludedFiles = [];

/**
 * Validate SVG file and extract aspect ratio
 * Returns { valid: boolean, errors: string[], aspectRatio: number|null }
 */
function validateSvg(filename, svgContent) {
  const errors = [];

  // Check filename pattern: must start with 4 digits then hyphen
  if (!/^\d{4}-.+\.svg$/.test(filename)) {
    errors.push('Filename must match NNNN-name.svg (4 digits + hyphen)');
  }

  // Extract aspect ratio from viewBox or width/height
  let aspectRatio = null;
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/);
    if (parts.length >= 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (w > 0 && h > 0) {
        aspectRatio = w / h;
      }
    }
  }

  // Fallback to width/height attributes
  if (aspectRatio === null) {
    const widthMatch = svgContent.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    const heightMatch = svgContent.match(/\bheight="(\d+(?:\.\d+)?)"/);
    if (widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]);
      const h = parseFloat(heightMatch[1]);
      if (w > 0 && h > 0) {
        aspectRatio = w / h;
      }
    }
  }

  // Check 2:1 aspect ratio (allow 5% tolerance)
  if (aspectRatio === null) {
    errors.push('Could not determine aspect ratio (no viewBox or width/height)');
  } else if (Math.abs(aspectRatio - 2) > 0.1) {
    errors.push(`Aspect ratio ${aspectRatio.toFixed(2)}:1 is not 2:1`);
  }

  return {
    valid: errors.length === 0,
    errors,
    aspectRatio,
  };
}

/**
 * Build icon map from SVG files in the source directory
 * Only includes valid SVGs matching NNNN-*.svg with 2:1 aspect ratio
 */
function buildIconMap() {
  const svgDir = join(CONFIG.assetsDir, CONFIG.svgDir);
  const files = readdirSync(svgDir).filter(f => f.endsWith('.svg'));
  const iconMap = {};

  console.log(`Scanning ${files.length} SVG files in ${CONFIG.svgDir}...\n`);

  for (const filename of files) {
    const svgPath = join(svgDir, filename);
    let svgContent;
    try {
      svgContent = readFileSync(svgPath, 'utf-8');
    } catch (err) {
      excludedFiles.push({ filename, reasons: [`Could not read file: ${err.message}`] });
      continue;
    }

    const validation = validateSvg(filename, svgContent);

    if (validation.valid) {
      // Extract numeric ID from filename (first 4 digits)
      const idMatch = filename.match(/^(\d{4})/);
      const iconId = parseInt(idMatch[1], 10);
      iconMap[iconId.toString()] = filename;
    } else {
      excludedFiles.push({ filename, reasons: validation.errors });
    }
  }

  // Write the icon map
  const mapPath = join(CONFIG.assetsDir, CONFIG.iconMapPath);
  writeFileSync(mapPath, JSON.stringify(iconMap, null, 2) + '\n');
  console.log(`Generated ${CONFIG.iconMapPath} with ${Object.keys(iconMap).length} icons`);

  return iconMap;
}

/**
 * Render SVG to PNG buffer at specified size (2:1 aspect ratio)
 *
 * IMPORTANT: Expands the SVG viewBox before rendering to capture content
 * that may extend beyond the original bounds (strokes, shadows, transforms).
 * The oversizeMargin is in SVG units proportional to the viewBox.
 */
function renderSvgToPng(svgPath, width, _height, oversizeMargin = 0) {
  let svgContent = readFileSync(svgPath, 'utf-8');

  // Expand viewBox to capture edge overflow (strokes, shadows, etc.)
  if (oversizeMargin > 0) {
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
      if (parts.length === 4) {
        const [minX, minY, vbWidth, vbHeight] = parts;
        // Calculate margin in viewBox units (proportional to render size)
        const vbMargin = (vbWidth / width) * oversizeMargin;
        const newViewBox = `${minX - vbMargin} ${minY - vbMargin} ${vbWidth + vbMargin * 2} ${vbHeight + vbMargin * 2}`;
        svgContent = svgContent.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`);
      }
    }
  }

  // Render SVG at target size + margin
  const renderWidth = width + oversizeMargin * 2;

  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: renderWidth,
    },
    background: 'transparent',
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

/**
 * Convert PNG to white with alpha for compositing
 * Final atlas will extract alpha channel for R8 texture format
 *
 * The input PNG is rendered at (width + margin*2) x (height + margin*2) to
 * capture edge overflow. We crop to exact dimensions, discarding the overflow.
 */
async function convertToWhiteWithAlpha(pngBuffer, width, height, margin = 4) {
  const oversizeWidth = width + margin * 2;
  const oversizeHeight = height + margin * 2;

  // Resize the oversized render to exact oversize dimensions (in case aspect differs slightly)
  const oversized = await sharp(pngBuffer)
    .ensureAlpha()
    .resize(oversizeWidth, oversizeHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      position: 'centre',
    })
    .toBuffer();

  // Extract exact center portion, cropping the expanded viewBox area
  const resized = await sharp(oversized)
    .extract({
      left: margin,
      top: margin,
      width: width,
      height: height,
    })
    .toBuffer();

  // Extract raw pixel data at exact dimensions
  const { data } = await sharp(resized)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert all colored pixels to white (preserve alpha)
  const pixels = new Uint8Array(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha > 0) {
      pixels[i] = 255;     // R
      pixels[i + 1] = 255; // G
      pixels[i + 2] = 255; // B
      // Keep alpha as-is
    }
  }

  // Convert back to PNG with exact dimensions
  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Build a single atlas at specified size
 */
async function buildAtlasForSize(iconWidth, iconMap, iconIds, svgDir) {
  const PADDING = 0; // No padding needed - icons are clipped to exact bounds during render
  const iconHeight = iconWidth / 2;
  const paddedWidth = iconWidth + PADDING;
  const paddedHeight = iconHeight + PADDING;

  // Calculate dynamic atlas dimensions based on icon count
  const atlasDims = calculateAtlasDimensions(iconIds.length, iconWidth, PADDING);
  const atlasWidth = CONFIG.atlasWidth || atlasDims.width;
  const atlasHeight = CONFIG.atlasHeight || atlasDims.height;

  const iconsPerRow = Math.floor(atlasWidth / paddedWidth);

  console.log(`\n--- Building ${iconWidth}x${iconHeight} atlas ---`);
  console.log(`Atlas size: ${atlasWidth}x${atlasHeight} (dynamic)`);
  console.log(`Grid: ${iconsPerRow} icons per row, ${iconIds.length} icons total`);

  // Prepare composite operations for sharp
  const compositeOps = [];
  const frames = {};

  for (let i = 0; i < iconIds.length; i++) {
    const iconId = iconIds[i];
    const filename = iconMap[iconId.toString()];

    if (!filename) {
      console.warn(`No filename for icon ID ${iconId}, skipping`);
      continue;
    }

    const svgPath = join(svgDir, filename);

    try {
      // Render SVG to PNG with expanded viewBox to capture edge overflow
      const RENDER_MARGIN = 2; // Extra pixels to render for strokes/shadows (minimal to avoid shrinking)
      const pngBuffer = renderSvgToPng(svgPath, iconWidth, iconHeight, RENDER_MARGIN);

      // Convert to white with alpha, cropping back to exact dimensions
      const whitePng = await convertToWhiteWithAlpha(pngBuffer, iconWidth, iconHeight, RENDER_MARGIN);

      // Calculate position in grid
      const col = i % iconsPerRow;
      const row = Math.floor(i / iconsPerRow);
      const x = col * paddedWidth;
      const y = row * paddedHeight;

      // Add to composite operations
      compositeOps.push({
        input: whitePng,
        left: x,
        top: y,
      });

      // Add frame to spritesheet JSON
      // Use padded format like "0001" for consistency
      const frameId = iconId.toString().padStart(4, '0');
      frames[frameId] = {
        frame: { x, y, w: iconWidth, h: iconHeight },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: iconWidth, h: iconHeight },
        sourceSize: { w: iconWidth, h: iconHeight },
      };

    } catch (err) {
      console.error(`Error processing ${filename}:`, err.message);
    }
  }

  // Create atlas image (grayscale/alpha-only for R8 texture format)
  console.log('Compositing atlas image...');

  // Create RGBA base, composite white+alpha icons, then extract alpha channel
  const atlasBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOps)
    .extractChannel(3) // Extract alpha channel as grayscale
    .png()
    .toBuffer();

  // Output filenames
  const atlasImageName = `timeline-atlas-${iconWidth}.png`;
  const atlasJsonName = `timeline-atlas-${iconWidth}.json`;

  // Generate spritesheet JSON (PIXI format)
  const spritesheetJson = {
    frames,
    meta: {
      app: 'buildIcons_TimeMarks.mjs',
      version: '1.0.0',
      image: atlasImageName,
      format: 'R8', // Alpha-only grayscale for tinting
      size: { w: atlasWidth, h: atlasHeight },
      scale: 1,
    },
  };

  // Write output files
  const outputDir = join(CONFIG.assetsDir, CONFIG.outputDir);
  const imagePath = join(outputDir, atlasImageName);
  const jsonPath = join(outputDir, atlasJsonName);

  writeFileSync(imagePath, atlasBuffer);
  console.log(`Written: ${atlasImageName}`);

  writeFileSync(jsonPath, JSON.stringify(spritesheetJson, null, 2));
  console.log(`Written: ${atlasJsonName}`);

  return Object.keys(frames).length;
}

/**
 * Print warnings about excluded files
 */
function printExcludedWarnings() {
  if (excludedFiles.length === 0) return;

  console.log('\n=== EXCLUDED FILES ===');
  for (const { filename, reasons } of excludedFiles) {
    console.log(`\n  ${filename}`);
    for (const reason of reasons) {
      console.log(`    - ${reason}`);
    }
  }
  console.log(`\nTotal excluded: ${excludedFiles.length} files`);
}

/**
 * Build all atlas sizes
 */
async function buildAtlas() {
  // Step 1: Build icon map from SVG files
  const iconMap = buildIconMap();
  const svgDir = join(CONFIG.assetsDir, CONFIG.svgDir);

  // Sort icon IDs numerically for consistent ordering
  const iconIds = Object.keys(iconMap)
    .map(id => parseInt(id, 10))
    .sort((a, b) => a - b);

  console.log(`\nGenerating atlases for sizes: ${ATLAS_SIZES.join(', ')}`);

  // Build each atlas size
  for (const size of ATLAS_SIZES) {
    await buildAtlasForSize(size, iconMap, iconIds, svgDir);
  }

  // Summary
  console.log('\n=== Atlas Build Complete ===');
  console.log(`Icons: ${iconIds.length}`);
  console.log(`Sizes: ${ATLAS_SIZES.map(s => `${s}x${s/2}`).join(', ')}`);
  console.log(`Output: ${CONFIG.outputDir}`);

  // Print warnings about excluded files
  printExcludedWarnings();
}

// Run
buildAtlas().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
