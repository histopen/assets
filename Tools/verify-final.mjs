#!/usr/bin/env node
import { promises as fs } from 'fs';

const files = ['0173-eiffel', '0175-CodeUr-Nammu', '0177-FordT', '0178-Greenpeace', '0183-Manhattan', '0185-UN'];

console.log('FINAL VERIFICATION:\n');

for (const file of files) {
  const content = await fs.readFile(`../Icons_TimeMarks/target/${file}.svg`, 'utf-8');

  const vbMatch = content.match(/viewBox="([^"]+)"/);
  const wMatch = content.match(/width="([^"]+)"/);
  const hMatch = content.match(/height="([^"]+)"/);
  const pathCount = (content.match(/<path/g) || []).length;
  const fillMatches = content.match(/fill="([^"]+)"/g) || [];
  const firstFill = fillMatches[0] || 'none';

  if (!vbMatch) {
    console.log(`${file}: ERROR - NO VIEWBOX`);
    continue;
  }

  const [vbX, vbY, vbW, vbH] = vbMatch[1].split(' ').map(Number);
  const aspect = vbW / vbH;

  console.log(`${file}:`);
  console.log(`  ✓ Display: ${wMatch[1]}×${hMatch[1]}`);
  console.log(`  ✓ ViewBox: ${vbW}×${vbH} (${aspect.toFixed(2)}:1 aspect)`);
  console.log(`  ✓ Paths: ${pathCount}`);
  console.log(`  ✓ First fill: ${firstFill}`);
  console.log('');
}
