#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { optimize } from 'svgo';
import { pathToFileURL } from 'url';

const ICONS_DIR = path.resolve('./Icons/TM_Icons');
const OUT_DIR = path.resolve('./Icons/TM_Icons/optimized');
const SVGO_CONFIG_PATH = path.resolve('./svgo.config.js');

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

function insertViewBoxIfMissing(svg, orig) {
  // if already has viewBox, return svg
  if (/viewBox=/.test(svg)) return svg;
  // try to read width/height from original (or svg)
  const m = /<svg[^>]*\swidth=["']?([0-9.]+)["']?[^>]*\sheight=["']?([0-9.]+)["']?/i.exec(orig);
  if (m) {
    const w = m[1];
    const h = m[2];
    // inject viewBox="0 0 w h" into the svg opening tag
    return svg.replace(/<svg(\s|>)/, `<svg viewBox=\"0 0 ${w} ${h}\"$1`);
  }
  return svg;
}

function addAttrs(svg) {
  // ensure role, focusable, preserveAspectRatio
  svg = svg.replace(/<svg([^>]*)>/i, (m, attrs) => {
    let s = '<svg' + attrs;
    if (!/role=/.test(attrs)) s += ' role="img"';
    if (!/focusable=/.test(attrs)) s += ' focusable="false"';
    if (!/preserveAspectRatio=/.test(attrs)) s += ' preserveAspectRatio="xMidYMid meet"';
    s += '>';
    return s;
  });
  return svg;
}

async function run() {
  console.log('Normalizing SVGs from', ICONS_DIR);
  await ensureOutDir();

  const configModule = await import(pathToFileURL(SVGO_CONFIG_PATH).href);
  const config = configModule.default || configModule;

  const files = await fs.readdir(ICONS_DIR);
  let processed = 0;
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.svg')) continue;
    const p = path.join(ICONS_DIR, file);
    const src = await fs.readFile(p, 'utf8');

    // run svgo optimize
    const result = optimize(src, { path: p, ...config });
    let data = result.data;

    // if viewBox missing, try to add it using width/height from original
    data = insertViewBoxIfMissing(data, src);

    // add accessibility attrs and preserveAspectRatio
    data = addAttrs(data);

    // write to output folder
    const outPath = path.join(OUT_DIR, file);
    await fs.writeFile(outPath, data, 'utf8');
    console.log('[OK] Normalized:', file);
    processed++;
  }

  console.log('Done. Processed', processed, 'files. Output in', OUT_DIR);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
