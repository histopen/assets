/**
 * Timeline Atlas Builder
 *
 * Converts SVG icons to texture atlases for PIXI.js
 * Generates 4 atlas sizes: 128x64, 96x48, 64x32, 32x16 (2:1 aspect ratio)
 * Output: timeline-atlas-{size}.png + timeline-atlas-{size}.json (PIXI spritesheet format)
 *
 * Usage: node "Tools/TimelineAtlas scripts/buildTimelineAtlas.mjs"
 */

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Atlas sizes to generate (width, height = width/2)
const ATLAS_SIZES = [128, 96, 64, 32];

// Configuration
const CONFIG = {
  // Atlas dimensions
  atlasWidth: 4096,
  atlasHeight: 4096,
  // Paths (relative to ghp/assets/)
  assetsDir: join(__dirname, '..', '..'),
  svgDir: 'Icons/TM_Icons',
  iconMapPath: 'Jsons/tMIconMap.json',
  outputDir: 'TimelineAtlas',
};

/**
 * Load and parse the icon map JSON
 */
function loadIconMap() {
  const mapPath = join(CONFIG.assetsDir, CONFIG.iconMapPath);
  const mapContent = readFileSync(mapPath, 'utf-8');
  return JSON.parse(mapContent);
}

/**
 * Render SVG to PNG buffer at specified size (2:1 aspect ratio)
 */
function renderSvgToPng(svgPath, width, height) {
  const svgContent = readFileSync(svgPath, 'utf-8');

  // Render SVG at target size
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    background: 'transparent',
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

/**
 * Convert colored PNG to white (preserving alpha)
 * This allows PIXI tinting to work correctly
 */
async function convertToWhite(pngBuffer, width, height) {
  // Extract raw pixel data
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

  // Convert back to PNG
  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Build a single atlas at specified size
 */
async function buildAtlasForSize(iconWidth, iconMap, iconIds, svgDir) {
  const PADDING = 4; // px between icons
  const iconHeight = iconWidth / 2;
  const paddedWidth = iconWidth + PADDING;
  const paddedHeight = iconHeight + PADDING;
  const iconsPerRow = Math.floor(CONFIG.atlasWidth / paddedWidth);
  const maxIcons = iconsPerRow * Math.floor(CONFIG.atlasHeight / paddedHeight);

  console.log(`\n--- Building ${iconWidth}x${iconHeight} atlas ---`);
  console.log(`Grid: ${iconsPerRow} icons per row, max ${maxIcons} icons`);

  if (iconIds.length > maxIcons) {
    console.warn(`Warning: ${iconIds.length} icons exceeds max ${maxIcons} for atlas size`);
  }

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
      // Render SVG to PNG
      const pngBuffer = renderSvgToPng(svgPath, iconWidth, iconHeight);

      // Convert to white (for tinting)
      const whitePng = await convertToWhite(pngBuffer, iconWidth, iconHeight);

      // Calculate position in grid
      const col = i % iconsPerRow;
      const row = Math.floor(i / iconsPerRow);
      const x = col * paddedWidth + Math.floor(PADDING / 2);
      const y = row * paddedHeight + Math.floor(PADDING / 2);

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
        padding: PADDING,
      };

    } catch (err) {
      console.error(`Error processing ${filename}:`, err.message);
    }
  }

  // Create atlas image
  console.log('Compositing atlas image...');

  const atlasBuffer = await sharp({
    create: {
      width: CONFIG.atlasWidth,
      height: CONFIG.atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOps)
    .png()
    .toBuffer();

  // Output filenames
  const atlasImageName = `timeline-atlas-${iconWidth}.png`;
  const atlasJsonName = `timeline-atlas-${iconWidth}.json`;

  // Generate spritesheet JSON (PIXI format)
  const spritesheetJson = {
    frames,
    meta: {
      app: 'buildTimelineAtlas.mjs',
      version: '1.0.0',
      image: atlasImageName,
      format: 'RGBA8888',
      size: { w: CONFIG.atlasWidth, h: CONFIG.atlasHeight },
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
 * Build all atlas sizes
 */
async function buildAtlas() {
  const iconMap = loadIconMap();
  const svgDir = join(CONFIG.assetsDir, CONFIG.svgDir);

  // Sort icon IDs numerically for consistent ordering
  const iconIds = Object.keys(iconMap)
    .map(id => parseInt(id, 10))
    .sort((a, b) => a - b);

  console.log(`Found ${iconIds.length} icons in map`);
  console.log(`Generating atlases for sizes: ${ATLAS_SIZES.join(', ')}`);

  // Build each atlas size
  for (const size of ATLAS_SIZES) {
    await buildAtlasForSize(size, iconMap, iconIds, svgDir);
  }

  // Summary
  console.log('\n=== Atlas Build Complete ===');
  console.log(`Icons: ${iconIds.length}`);
  console.log(`Sizes: ${ATLAS_SIZES.map(s => `${s}x${s/2}`).join(', ')}`);
  console.log(`Output: ${CONFIG.outputDir}`);
}

// Run
buildAtlas().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
