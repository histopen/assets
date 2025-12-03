#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { load } from 'cheerio';
import svgpath from 'svgpath';
import pathBounds from 'svg-path-bounds';

const folder = process.argv[2] || './Tools/svg scripts/font2svg/testicons/optimized/recentered';
const DIR = path.resolve(folder);

function rectToPath(x, y, width, height) {
  x = parseFloat(x||0); y = parseFloat(y||0); width = parseFloat(width||0); height = parseFloat(height||0);
  return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
}
function circleToPath(cx, cy, r){ cx = parseFloat(cx||0); cy = parseFloat(cy||0); r = parseFloat(r||0); return `M ${cx-r} ${cy} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0 Z`; }
function ellipseToPath(cx, cy, rx, ry){ cx = parseFloat(cx||0); cy = parseFloat(cy||0); rx = parseFloat(rx||0); ry = parseFloat(ry||0); return `M ${cx-rx} ${cy} a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0 Z`; }
function polyToPath(points, close){ const pts=(points||'').trim().split(/[ ,]+/).map(Number); if(pts.length<2) return ''; let d=`M ${pts[0]} ${pts[1]}`; for(let i=2;i<pts.length;i+=2) d+=` L ${pts[i]} ${pts[i+1]}`; if(close) d+=' Z'; return d; }
function lineToPath(x1,y1,x2,y2){ x1=parseFloat(x1||0); y1=parseFloat(y1||0); x2=parseFloat(x2||0); y2=parseFloat(y2||0); return `M ${x1} ${y1} L ${x2} ${y2}`; }

function getElementPathData($el){
  const raw = ($el[0].tagName||'').toString();
  const name = raw.includes(':') ? raw.split(':').pop() : raw;
  if (name==='path') return $el.attr('d')||'';
  if (name==='rect' || name==='image') return rectToPath($el.attr('x'), $el.attr('y'), $el.attr('width'), $el.attr('height'));
  if (name==='circle') return circleToPath($el.attr('cx'), $el.attr('cy'), $el.attr('r'));
  if (name==='ellipse') return ellipseToPath($el.attr('cx'), $el.attr('cy'), $el.attr('rx'), $el.attr('ry'));
  if (name==='polyline') return polyToPath($el.attr('points'), false);
  if (name==='polygon') return polyToPath($el.attr('points'), true);
  if (name==='line') return lineToPath($el.attr('x1'), $el.attr('y1'), $el.attr('x2'), $el.attr('y2'));
  return '';
}

async function analyze(file){
  const src = await fs.readFile(file,'utf8');
  const $ = load(src,{xmlMode:true});
  // find svg
  let $svg = $('svg');
  if (!$svg.length){ const $all = $('*'); const $c = $all.filter((i,el)=>{ const tn=(el.tagName||'').toString(); return tn==='svg' || tn.endsWith(':svg'); }); if($c.length) $svg=$( $c.get(0) ); }
  if (!$svg || !$svg.length) return {file, ok:false, reason:'no-svg'};
  let vb = $svg.attr('viewBox');
  let vx=0,vy=0,vw=0,vh=0;
  if (vb) { const parts=vb.split(/\s+/).map(Number); [vx,vy,vw,vh]=parts; }
  else { const w=parseFloat($svg.attr('width')||0); const h=parseFloat($svg.attr('height')||0); vw=w; vh=h; }

  let bbox=null;
  $svg.find('*').each((i,el)=>{
    const $el=$(el);
    const raw=(el.tagName||'').toString(); const name=raw.includes(':')?raw.split(':').pop():raw;
    if (!['path','rect','image','circle','ellipse','polyline','polygon','line'].includes(name)) return;
    let d = getElementPathData($el);
    if (!d) return;
    const t = $el.attr('transform'); if (t){ try{ d = svgpath(d).transform(t).toString(); }catch(e){} }
    try{ const [x1,y1,x2,y2]=pathBounds(d); const nb={x1,y1,x2,y2}; if(!bbox) bbox=nb; else { bbox.x1=Math.min(bbox.x1,nb.x1); bbox.y1=Math.min(bbox.y1,nb.y1); bbox.x2=Math.max(bbox.x2,nb.x2); bbox.y2=Math.max(bbox.y2,nb.y2); } }catch(e){}
  });
  if (!bbox) return {file, ok:false, reason:'no-geometry'};
  const cx=(bbox.x1+bbox.x2)/2; const cy=(bbox.y1+bbox.y2)/2; const tvx=vx+vw/2; const tvy=vy+vh/2; const dx=tvx-cx; const dy=tvy-cy; const dist=Math.hypot(dx,dy);
  return {file, ok:true, dx,dy,dist};
}

async function run(){
  const files = await fs.readdir(DIR).catch(()=>[]);
  const svgs = files.filter(f=>f.toLowerCase().endsWith('.svg'));
  const results=[];
  for(const f of svgs){ const p=path.join(DIR,f); const r=await analyze(p); results.push(r); }
  const total=results.length; const noGeom=results.filter(r=>r.ok===false).length; const centered=results.filter(r=>r.ok && r.dist<0.5).length; const offset=results.filter(r=>r.ok && r.dist>=0.5).length;
  console.log('Folder:', DIR);
  console.log('Total SVGs:', total);
  console.log('No geometry:', noGeom);
  console.log('Centered (<0.5 units):', centered);
  console.log('Offset (>=0.5 units):', offset);
  const sample = results.filter(r=>r.ok && r.dist>=0.5).slice(0,20);
  if (sample.length){ console.log('Sample offsets:'); sample.forEach(s=> console.log(s.file, 'dist=', s.dist.toFixed(2), 'dx=', s.dx.toFixed(2), 'dy=', s.dy.toFixed(2))); }
}

run().catch(e=>{ console.error(e); process.exit(1); });
