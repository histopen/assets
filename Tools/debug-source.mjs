#!/usr/bin/env node
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import { getPathBBox } from 'svg-path-commander';

const files = ['0173-eiffel', '0177-FordT', '0178-Greenpeace', '0183-Manhattan', '0185-UN'];

for (const file of files) {
  const content = await fs.readFile(`../Icons_TimeMarks/source/${file}.svg`, 'utf-8');
  const $ = cheerio.load(content, { xmlMode: true });
  const $svg = $('svg');

  const origVB = $svg.attr('viewBox');
  const origW = $svg.attr('width');
  const origH = $svg.attr('height');

  // Get actual content bounds from paths
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  $svg.find('path').each((i, el) => {
    const d = $(el).attr('d');
    if (d) {
      try {
        const bbox = getPathBBox(d);
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x2);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y2);
      } catch (e) {}
    }
  });

  console.log(`${file} SOURCE:`);
  console.log(`  Original viewBox: ${origVB || 'none'}`);
  console.log(`  Original size: ${origW}×${origH}`);
  console.log(`  Content bounds: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
  console.log(`  Content size: ${(maxX-minX).toFixed(1)}×${(maxY-minY).toFixed(1)}`);
  console.log('');
}
