#!/usr/bin/env node
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import { getPathBBox } from 'svg-path-commander';

const files = await fs.readdir('../Icons_TimeMarks/target');
const svgFiles = files.filter(f => f.endsWith('.svg'));

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       SVG REQUIREMENTS VALIDATION CHECKLIST               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let allPassed = true;

for (const file of svgFiles) {
  const content = await fs.readFile(`../Icons_TimeMarks/target/${file}`, 'utf-8');
  const $ = cheerio.load(content, { xmlMode: true });
  const $svg = $('svg');

  console.log(`\n${file}:`);
  console.log('─'.repeat(60));

  const results = [];

  // 1. Check width="400" and height="200"
  const width = $svg.attr('width');
  const height = $svg.attr('height');
  const check1 = width === '400' && height === '200';
  results.push(check1);
  console.log(`${check1 ? '✅' : '❌'} width="400" and height="200" (found: ${width}×${height})`);

  // 2. ViewBox aspect ratio is exactly 2:1
  const vb = $svg.attr('viewBox');
  const [vbX, vbY, vbW, vbH] = vb ? vb.split(' ').map(Number) : [0, 0, 0, 0];
  const aspect = vbW / vbH;
  const check2 = Math.abs(aspect - 2.0) < 0.01;
  results.push(check2);
  console.log(`${check2 ? '✅' : '❌'} ViewBox aspect ratio is 2:1 (found: ${aspect.toFixed(2)}:1)`);

  // 3. ViewBox dimensions are reasonable (50-6000 unit range)
  const check3 = vbW >= 50 && vbW <= 6000 && vbH >= 25 && vbH <= 3000;
  results.push(check3);
  console.log(`${check3 ? '✅' : '❌'} ViewBox reasonable size (found: ${vbW.toFixed(0)}×${vbH.toFixed(0)})`);

  // Helper function to parse transforms
  function parseTransform(transform) {
    if (!transform) return { tx: 0, ty: 0, scale: 1 };

    // Handle translate + scale: translate(x y)scale(s)
    const translateScaleMatch = transform.match(/translate\(([^)]+)\)\s*scale\(([^)]+)\)/);
    if (translateScaleMatch) {
      const [tx, ty] = translateScaleMatch[1].split(/\s+/).map(Number);
      const scale = parseFloat(translateScaleMatch[2]);
      return { tx, ty, scale };
    }

    // Handle just translate: translate(x, y) or translate(x y)
    const translateMatch = transform.match(/translate\(([^,)]+)[,\s]+([^)]+)\)/);
    if (translateMatch) {
      return { tx: parseFloat(translateMatch[1]) || 0, ty: parseFloat(translateMatch[2]) || 0, scale: 1 };
    }

    // Handle just scale: scale(s)
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      return { tx: 0, ty: 0, scale: parseFloat(scaleMatch[1]) };
    }

    // Handle matrix: matrix(a b c d e f) where e,f are translate and a,d are scale
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const [a, b, c, d, e, f] = matrixMatch[1].split(/\s+/).map(Number);
      return { tx: e, ty: f, scale: Math.sqrt(a * a + b * b) };
    }

    return { tx: 0, ty: 0, scale: 1 };
  }

  function isInsideDefs($, el) {
    let node = el;
    while (node) {
      if (node.name === 'defs' || (node.name && node.name.endsWith(':defs'))) return true;
      node = node.parent;
    }
    return false;
  }

  // Helper to apply transform to bbox
  function applyTransformToBBox(bbox, transform) {
    let left = bbox.x;
    let top = bbox.y;
    let right = bbox.x2;
    let bottom = bbox.y2;

    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const [a, b, c, d, e, f] = matrixMatch[1].split(/[\s,]+/).map(Number);
      const corners = [
        [left, top], [right, top], [left, bottom], [right, bottom]
      ];
      const transformed = corners.map(([x, y]) => [
        a * x + c * y + e,
        b * x + d * y + f
      ]);
      left = Math.min(...transformed.map(([x, _]) => x));
      right = Math.max(...transformed.map(([x, _]) => x));
      top = Math.min(...transformed.map(([_, y]) => y));
      bottom = Math.max(...transformed.map(([_, y]) => y));
    } else {
      const { tx, ty, scale } = parseTransform(transform);
      left = left * scale + tx;
      right = right * scale + tx;
      top = top * scale + ty;
      bottom = bottom * scale + ty;
    }

    return { left, top, right, bottom };
  }

  // Get content bounds (with transform support, including <use> elements)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let pathCount = 0;

  // Process <path> elements
  $svg.find('path').each((i, el) => {
    // Skip paths inside <defs>
    if (isInsideDefs($, el)) return;

    const d = $(el).attr('d');
    if (d) {
      pathCount++;
      try {
        const bbox = getPathBBox(d);
        let left = bbox.x, top = bbox.y, right = bbox.x2, bottom = bbox.y2;

        // Check for transforms on this element and parent elements
        let node = el;
        while (node && node.name !== 'svg') {
          const transform = $(node).attr('transform');
          if (transform) {
            const transformed = applyTransformToBBox({ x: left, y: top, x2: right, y2: bottom }, transform);
            left = transformed.left;
            right = transformed.right;
            top = transformed.top;
            bottom = transformed.bottom;
          }
          node = node.parent;
        }

        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
      } catch (e) {}
    }
  });

  // Process <use> elements
  $svg.find('use').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('xlink:href') || $el.attr('href');
    if (!href) return;

    const refId = href.replace('#', '');
    const $ref = $(`#${refId}`);

    if ($ref.length > 0 && $ref.attr('d')) {
      const d = $ref.attr('d');
      try {
        const bbox = getPathBBox(d);
        const transform = $el.attr('transform');

        if (transform) {
          const transformed = applyTransformToBBox(bbox, transform);
          minX = Math.min(minX, transformed.left);
          maxX = Math.max(maxX, transformed.right);
          minY = Math.min(minY, transformed.top);
          maxY = Math.max(maxY, transformed.bottom);
        }
      } catch (e) {}
    }
  });

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const fillW = contentW / vbW;
  const fillH = contentH / vbH;
  const maxFill = Math.max(fillW, fillH);

  // 4. Content fills 96-99% of the constraining dimension (STRICT)
  const check4 = maxFill >= 0.96 && maxFill <= 0.99;
  results.push(check4);
  console.log(`${check4 ? '✅' : '❌'} Content fills 96-99% of constraining dimension (found: ${(maxFill * 100).toFixed(1)}%)`);

  // 5. Content is perfectly centered horizontally (STRICT: < 1 unit difference)
  const leftMargin = minX - vbX;
  const rightMargin = (vbX + vbW) - maxX;
  const topMargin = minY - vbY;
  const bottomMargin = (vbY + vbH) - maxY;

  const hMarginDiff = Math.abs(leftMargin - rightMargin);
  const vMarginDiff = Math.abs(topMargin - bottomMargin);

  const check5a = hMarginDiff < 1.0;
  results.push(check5a);
  console.log(`${check5a ? '✅' : '❌'} Content centered horizontally (H-margin diff: ${hMarginDiff.toFixed(3)} units)`);

  // 6. Content is perfectly centered vertically (STRICT: < 1 unit difference)
  const check5b = vMarginDiff < 1.0;
  results.push(check5b);
  console.log(`${check5b ? '✅' : '❌'} Content centered vertically (V-margin diff: ${vMarginDiff.toFixed(3)} units)`);

  // 7. Content does not extend beyond viewBox (STRICT: no clipping)
  const extendsLeft = minX < vbX;
  const extendsRight = maxX > (vbX + vbW);
  const extendsTop = minY < vbY;
  const extendsBottom = maxY > (vbY + vbH);
  const isClipped = extendsLeft || extendsRight || extendsTop || extendsBottom;
  const check7 = !isClipped;
  results.push(check7);
  if (check7) {
    console.log(`${check7 ? '✅' : '❌'} Content within viewBox (no clipping)`);
  } else {
    const clips = [];
    if (extendsLeft) clips.push(`LEFT by ${(vbX - minX).toFixed(1)}`);
    if (extendsRight) clips.push(`RIGHT by ${(maxX - (vbX + vbW)).toFixed(1)}`);
    if (extendsTop) clips.push(`TOP by ${(vbY - minY).toFixed(1)}`);
    if (extendsBottom) clips.push(`BOTTOM by ${(maxY - (vbY + vbH)).toFixed(1)}`);
    console.log(`❌ Content extends beyond viewBox: ${clips.join(', ')}`);
  }

  // 8. No fill="none" allowed (STRICT)
  const fillNoneCount = (content.match(/fill="none"/g) || []).length;
  const check8 = fillNoneCount === 0;
  results.push(check8);
  console.log(`${check8 ? '✅' : '❌'} No fill="none" (found: ${fillNoneCount})`);

  // 9. All colored fills normalized to #ffffff or #fff
  const fillMatches = content.match(/fill="([^"]+)"/g) || [];
  const nonWhiteFills = fillMatches.filter(f =>
    !f.includes('#fff') && !f.includes('#FFF') && !f.includes('none')
  );
  const check9 = nonWhiteFills.length === 0;
  results.push(check9);
  console.log(`${check9 ? '✅' : '❌'} All fills normalized to #fff (non-white found: ${nonWhiteFills.length})`);

  // 10. Icon is clearly visible (subjective - check if has content)
  const check10 = pathCount > 0 && contentW > 0 && contentH > 0;
  results.push(check10);
  console.log(`${check10 ? '✅' : '❌'} Icon has visible content (${pathCount} paths)`);

  // 11. Has reasonable margins (not excessive whitespace)
  const marginRatioW = Math.min(leftMargin, rightMargin) / vbW;
  const marginRatioH = Math.min(topMargin, bottomMargin) / vbH;
  const minMarginRatio = Math.min(marginRatioW, marginRatioH);
  const check11 = minMarginRatio >= -0.20 && minMarginRatio <= 0.30; // Allow negative margins (viewBox windowing)
  results.push(check11);
  console.log(`${check11 ? '✅' : '❌'} Reasonable margins (found: ${(minMarginRatio * 100).toFixed(1)}%)`);

  // 12. Content visible (overlaps with viewBox)
  const contentOverlaps = !(maxX < vbX || minX > (vbX + vbW) ||
                            maxY < vbY || minY > (vbY + vbH));
  const check12 = contentOverlaps;
  results.push(check12);
  console.log(`${check12 ? '✅' : '❌'} Content visible (overlaps with viewBox)`);

  // 13. ViewBox size is manageable (not excessively large)
  const check13 = vbW < 6000; // ViewBox width under 6000 units
  results.push(check13);
  console.log(`${check13 ? '✅' : '❌'} ViewBox size manageable (${vbW.toFixed(0)} < 6000)`);

  // 14. File contains actual path data
  const fileSize = content.length;
  const check14 = pathCount > 0 && fileSize > 200;
  results.push(check14);
  console.log(`${check14 ? '✅' : '❌'} File has content (${fileSize} bytes, ${pathCount} paths)`);

  const passedCount = results.filter(r => r).length;
  const totalCount = results.length;
  const allChecksPassed = passedCount === totalCount;

  console.log(`\n${allChecksPassed ? '✅ PASSED' : '❌ FAILED'}: ${passedCount}/${totalCount} criteria met`);

  if (!allChecksPassed) {
    allPassed = false;
  }
}

console.log('\n' + '═'.repeat(60));
console.log(allPassed ? '✅ ALL FILES PASSED VALIDATION' : '❌ SOME FILES FAILED VALIDATION');
console.log('═'.repeat(60) + '\n');

process.exit(allPassed ? 0 : 1);
