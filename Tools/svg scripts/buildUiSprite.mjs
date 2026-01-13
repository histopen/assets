#!/usr/bin/env node
/**
 * UI Sprite Builder
 *
 * Combines all UI icons into a single SVG sprite file.
 * Run: node "Tools/svg scripts/buildUiSprite.mjs"
 */

import { promises as fs } from 'fs';
import { basename, dirname, join } from 'path';
import { optimize } from 'svgo';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../../Icons_UI');
const OUTPUT_FILE = join(ICONS_DIR, 'sprites-ui.svg');

// UI icon folders to include
const UI_FOLDERS = ['UI_Debug', 'UI_flags', 'UI_Social', 'UI_SourceNavbar', 'UI_Sources', 'UI_Toolbar'];

async function buildSprite() {
  console.log('Building UI sprite...\n');

  let symbols = '';
  let count = 0;

  for (const folder of UI_FOLDERS) {
    const folderPath = join(ICONS_DIR, folder);
    try {
      const files = await fs.readdir(folderPath);
      const svgFiles = files.filter(f => f.endsWith('.svg'));

      for (const file of svgFiles) {
        const content = await fs.readFile(join(folderPath, file), 'utf-8');
        const id = basename(file, '.svg');

        // Extract viewBox (or construct from width/height if missing)
        const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
        let viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

        let w = 24, h = 24;
        if (viewBox) {
          const vb = viewBox.split(' ');
          if (vb.length === 4) {
            w = parseInt(vb[2], 10);
            h = parseInt(vb[3], 10);
          }
        } else {
          const widthMatch = content.match(/\bwidth="(\d+)"/);
          const heightMatch = content.match(/\bheight="(\d+)"/);
          w = widthMatch ? parseInt(widthMatch[1], 10) : 24;
          h = heightMatch ? parseInt(heightMatch[1], 10) : 24;
          viewBox = `0 0 ${w} ${h}`;
        }

        // Add padding
        const PADDING = 4;
        const paddedViewBox = `0 0 ${w + PADDING} ${h + PADDING}`;
        // Extract inner content (remove <svg> wrapper and XML declaration)
        const inner = content
          .replace(/<\?xml[^>]*\?>/g, '')
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>\s*$/, '')
          .trim();

        // Wrap inner content in a <g> and translate by PADDING/2
        symbols += `  <symbol id="${id}" viewBox="${paddedViewBox}"><g transform="translate(${PADDING/2},${PADDING/2})">${inner}</g></symbol>\n`;
        count++;
      }

      console.log(`  ${folder}: ${svgFiles.length} icons`);
    } catch (e) {
      console.warn(`  Skipping ${folder}: ${e.message}`);
    }
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">\n${symbols}</svg>`;

  // Write unoptimized first to verify content
  await fs.writeFile(OUTPUT_FILE, sprite);

  // Then optimize with SVGO
  try {
    const result = optimize(sprite, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              cleanupIds: false,
            }
          }
        }
      ]
    });
    if (result.data && result.data.length > 0) {
      await fs.writeFile(OUTPUT_FILE, result.data);
    }
  } catch (e) {
    console.warn('SVGO optimization skipped:', e.message);
  }

  const stats = await fs.stat(OUTPUT_FILE);
  console.log(`\n✓ Built sprites-ui.svg with ${count} icons (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`  Output: ${OUTPUT_FILE}`);
}

buildSprite().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
