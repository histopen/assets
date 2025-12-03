#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { load } from 'cheerio';
import svgpath from 'svgpath';
import pathBounds from 'svg-path-bounds';

const ICONS_DIR = path.resolve('./Icons/TM_Icons/optimized');
const OUT_DIR = path.resolve('./Icons/TM_Icons/recentered');

function rectToPath(x, y, width, height) {
	x = parseFloat(x||0); y = parseFloat(y||0); width = parseFloat(width||0); height = parseFloat(height||0);
	return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
}

function circleToPath(cx, cy, r){
	cx = parseFloat(cx||0); cy = parseFloat(cy||0); r = parseFloat(r||0);
	return `M ${cx-r} ${cy} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0 Z`;
}

function ellipseToPath(cx, cy, rx, ry){
	cx = parseFloat(cx||0); cy = parseFloat(cy||0); rx = parseFloat(rx||0); ry = parseFloat(ry||0);
	return `M ${cx-rx} ${cy} a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0 Z`;
}

function polyToPath(points, close){
	const pts = (points||'').trim().split(/[ ,]+/).map(Number);
	if (pts.length<2) return '';
	let d = `M ${pts[0]} ${pts[1]}`;
	for (let i=2;i<pts.length;i+=2) d += ` L ${pts[i]} ${pts[i+1]}`;
	if (close) d += ' Z';
	return d;
}

function lineToPath(x1,y1,x2,y2){
	x1 = parseFloat(x1||0); y1 = parseFloat(y1||0); x2 = parseFloat(x2||0); y2 = parseFloat(y2||0);
	return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function getElementPathData($el){
	const name = $el[0].tagName;
	if (name==='path') return $el.attr('d')||'';
	if (name==='rect') return rectToPath($el.attr('x'), $el.attr('y'), $el.attr('width'), $el.attr('height'));
	if (name==='image') return rectToPath($el.attr('x'), $el.attr('y'), $el.attr('width'), $el.attr('height'));
	if (name==='circle') return circleToPath($el.attr('cx'), $el.attr('cy'), $el.attr('r'));
	if (name==='ellipse') return ellipseToPath($el.attr('cx'), $el.attr('cy'), $el.attr('rx'), $el.attr('ry'));
	if (name==='polyline') return polyToPath($el.attr('points'), false);
	if (name==='polygon') return polyToPath($el.attr('points'), true);
	if (name==='line') return lineToPath($el.attr('x1'), $el.attr('y1'), $el.attr('x2'), $el.attr('y2'));
	return '';
}

async function ensureOut(){
	await fs.mkdir(OUT_DIR, { recursive: true });
}

function combineBbox(bbox, nb){
	if (!bbox) return nb;
	const x1 = Math.min(bbox.x1, nb.x1);
	const y1 = Math.min(bbox.y1, nb.y1);
	const x2 = Math.max(bbox.x2, nb.x2);
	const y2 = Math.max(bbox.y2, nb.y2);
	return { x1, y1, x2, y2 };
}

async function processFile(file){
	const p = path.join(ICONS_DIR, file);
	const src = await fs.readFile(p, 'utf8');
	const $ = load(src, { xmlMode: true });
	const $svg = $('svg');
	if (!$svg.length) return;

	let viewBox = $svg.attr('viewBox');
	let vb;
	if (viewBox) vb = viewBox.split(/\s+/).map(Number);
	else {
		const w = parseFloat($svg.attr('width')||0);
		const h = parseFloat($svg.attr('height')||0);
		vb = [0,0,w,h];
		$svg.attr('viewBox', vb.join(' '));
	}
	const [vx, vy, vw, vh] = vb;

	// compute bbox of content by converting shapes to paths
	let globalBBox = null;
	$svg.find('*').each((i,el)=>{
		const $el = $(el);
		const tag = el.tagName;
		if (tag==='path' || tag==='rect' || tag==='image' || tag==='circle' || tag==='ellipse' || tag==='polyline' || tag==='polygon' || tag==='line'){
			let d = getElementPathData($el);
			if (!d) return;
			const t = $el.attr('transform');
			if (t) {
				try{ d = svgpath(d).transform(t).toString(); }catch(e){/*ignore*/}
			}
			try{
				const [x1,y1,x2,y2] = pathBounds(d);
				const nb = { x1,y1,x2,y2 };
				globalBBox = combineBbox(globalBBox, nb);
			}catch(e){/*ignore*/}
		}
	});

	if (!globalBBox) {
		await fs.writeFile(path.join(OUT_DIR,file), src, 'utf8');
		console.log('[SKIP] No shapes:', file);
		return;
	}

	const contentCenterX = (globalBBox.x1 + globalBBox.x2)/2;
	const contentCenterY = (globalBBox.y1 + globalBBox.y2)/2;
	const targetCenterX = vx + vw/2;
	const targetCenterY = vy + vh/2;

	const dx = targetCenterX - contentCenterX;
	const dy = targetCenterY - contentCenterY;

	const inner = $svg.html();
	const g = `<g transform="translate(${dx} ${dy})">${inner}</g>`;
	$svg.html(g);

	const out = $.xml();
	await fs.writeFile(path.join(OUT_DIR,file), out, 'utf8');
	console.log('[OK] Recentered:', file);
}

async function run(){
	await ensureOut();
	const files = await fs.readdir(ICONS_DIR);
	for(const f of files){
		if (!f.toLowerCase().endsWith('.svg')) continue;
		try{ await processFile(f);}catch(e){ console.error('ERR',f,e); }
	}
	console.log('Done. Output in', OUT_DIR);
}

run().catch(err=>{ console.error(err); process.exit(1); });
