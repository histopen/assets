#!/usr/bin/env node
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import { getPathBBox } from 'svg-path-commander';

const files = ['0001-univ-milkyway.svg', '0010-life-oxygen.svg', '0020-dino2-tRex.svg', '0050-book-quran.svg'];

for (const file of files) {
  const content = await fs.readFile(`../Icons_TimeMarks/TM_Icons/${file}`, 'utf-8');
  const $ = cheerio.load(content, { xmlMode: true });
  const $svg = $('svg');

  const vb = $svg.attr('viewBox');
  const [vbX, vbY, vbW, vbH] = vb.split(' ').map(Number);

  // Get actual content bounds
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

  const cW = maxX - minX;
  const cH = maxY - minY;

  console.log(`${file}:`);
  console.log(`  ViewBox: ${vbW.toFixed(1)}×${vbH.toFixed(1)} (aspect ${(vbW/vbH).toFixed(2)}:1)`);
  console.log(`  Content: ${cW.toFixed(1)}×${cH.toFixed(1)} at (${minX.toFixed(1)}, ${minY.toFixed(1)})`);
  console.log(`  Fill: ${(cW/vbW*100).toFixed(1)}% width, ${(cH/vbH*100).toFixed(1)}% height`);
  console.log('');
}
