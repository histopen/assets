/**
 * Timeline Atlas Builder
 *
 * Converts SVG icons to a texture atlas for PIXI.js
 * Output: timeline-atlas.png + timeline-atlas.json (PIXI spritesheet format)
 *
 * Usage: node "Tools/TimelineAtlas scripts/buildTimelineAtlas.mjs"
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Icon size in atlas (pixels)
  iconSize: 64,
  // Atlas dimensions
  atlasWidth: 4096,
  atlasHeight: 4096,
  // Paths (relative to ghp/assets/)
  assetsDir: join(__dirname, '..', '..'),
  svgDir: 'Icons/TM_Icons',
  iconMapPath: 'Jsons/tMIconMap.json',
  outputDir: 'TimelineAtlas',
  // Output filenames
  atlasImageName: 'timeline-atlas.png',
  atlasJsonName: 'timeline-atlas.json',
};

// Calculate grid dimensions
const iconsPerRow = Math.floor(CONFIG.atlasWidth / CONFIG.iconSize);
const maxIcons = iconsPerRow * Math.floor(CONFIG.atlasHeight / CONFIG.iconSize);

console.log(`Atlas config: ${CONFIG.iconSize}x${CONFIG.iconSize} icons, ${iconsPerRow} per row, max ${maxIcons} icons`);

/**
 * Load and parse the icon map JSON
 */
function loadIconMap() {
  const mapPath = join(CONFIG.assetsDir, CONFIG.iconMapPath);
  const mapContent = readFileSync(mapPath, 'utf-8');
  return JSON.parse(mapContent);
}

/**
 * Render SVG to white PNG buffer at specified size
 * Icons are rendered as white (#FFFFFF) for tinting in PIXI
 */
function renderSvgToWhitePng(svgPath, size) {
  const svgContent = readFileSync(svgPath, 'utf-8');

  // Render SVG at target size
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: size,
    },
    background: 'transparent',
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return pngBuffer;
}

/**
 * Convert colored PNG to white (preserving alpha)
 * This allows PIXI tinting to work correctly
 */
async function convertToWhite(pngBuffer, size) {
  // Extract raw pixel data
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
    raw: {
      width: size,
      height: size,
      channels: 4,
    },
  }).png().toBuffer();
}

/**
 * Build the texture atlas
 */
async function buildAtlas() {
  const iconMap = loadIconMap();
  const svgDir = join(CONFIG.assetsDir, CONFIG.svgDir);

  // Sort icon IDs numerically for consistent ordering
  const iconIds = Object.keys(iconMap)
    .map(id => parseInt(id, 10))
    .sort((a, b) => a - b);

  console.log(`Found ${iconIds.length} icons in map`);

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
      const pngBuffer = renderSvgToWhitePng(svgPath, CONFIG.iconSize);

      // Convert to white (for tinting)
      const whitePng = await convertToWhite(pngBuffer, CONFIG.iconSize);

      // Calculate position in grid
      const col = i % iconsPerRow;
      const row = Math.floor(i / iconsPerRow);
      const x = col * CONFIG.iconSize;
      const y = row * CONFIG.iconSize;

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
        frame: { x, y, w: CONFIG.iconSize, h: CONFIG.iconSize },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: CONFIG.iconSize, h: CONFIG.iconSize },
        sourceSize: { w: CONFIG.iconSize, h: CONFIG.iconSize },
      };

      console.log(`  [${i + 1}/${iconIds.length}] ${frameId}: ${filename}`);

    } catch (err) {
      console.error(`Error processing ${filename}:`, err.message);
    }
  }

  // Create atlas image
  console.log('\nCompositing atlas image...');

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

  // Generate spritesheet JSON (PIXI format)
  const spritesheetJson = {
    frames,
    meta: {
      app: 'buildTimelineAtlas.mjs',
      version: '1.0.0',
      image: CONFIG.atlasImageName,
      format: 'RGBA8888',
      size: { w: CONFIG.atlasWidth, h: CONFIG.atlasHeight },
      scale: 1,
    },
  };

  // Write output files
  const outputDir = join(CONFIG.assetsDir, CONFIG.outputDir);
  const imagePath = join(outputDir, CONFIG.atlasImageName);
  const jsonPath = join(outputDir, CONFIG.atlasJsonName);

  writeFileSync(imagePath, atlasBuffer);
  console.log(`Written: ${imagePath}`);

  writeFileSync(jsonPath, JSON.stringify(spritesheetJson, null, 2));
  console.log(`Written: ${jsonPath}`);

  // Summary
  console.log('\n=== Atlas Build Complete ===');
  console.log(`Icons: ${Object.keys(frames).length}`);
  console.log(`Atlas size: ${CONFIG.atlasWidth}x${CONFIG.atlasHeight}`);
  console.log(`Icon size: ${CONFIG.iconSize}x${CONFIG.iconSize}`);
  console.log(`Output: ${outputDir}`);
}

// Run
buildAtlas().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
