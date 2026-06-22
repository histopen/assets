// enrichTimeData.mjs — add catalog facets (categories / countries / type) to a
// library's TimeData.json so the Files-panel catalog can sort/filter by them.
//
// Two passes:
//   1. dbtm inherit (offline, default) — match each td to dbtm by Wikipedia slug
//      (`url`) and copy its curated `categories` (bcpst) + `countries`. Free,
//      deterministic, high-precision; covers whatever overlaps dbtm.
//   2. Wikidata gap-fill (--wikidata) — for td dbtm didn't cover, fetch
//      `type` (entityType, from P31) and `countries` (from P17) from Wikidata.
//      Batched ≤50 ids / 300 ms (polite). `categories` (bcpst) is editorial and
//      NOT guessed here — author it by hand or inherit from dbtm.
//
// Writes are MINIMAL text edits: a facet suffix is inserted into the entry's
// existing on-disk line, so every other byte (incl. hand-authored formatting
// like the `comment` field's spacing) stays identical → tiny, reviewable diffs.
// Fields use the SAME names as dbtm/canonical: `categories` (comma-sep string),
// `countries` (string[]), `type` (entityType).
//
// Usage (run from the assets/Tools dir, like the other tools):
//   node jsontools/enrichTimeData.mjs --lib=ibSchools            # offline dbtm pass
//   node jsontools/enrichTimeData.mjs --lib=ibSchools --wikidata # + Wikidata gaps
//   node jsontools/enrichTimeData.mjs --lib=all --dry            # report only, no write

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const JSONS = resolve(SCRIPT_DIR, '../../Jsons');           // C:\code\assets\Jsons
const TOS = `${JSONS}/timeObjectsServer`;

// library id (LIBRARY_REGISTRY) → TimeData file prefix
const LIB_FILE = { histotime: 'academy', ibSchools: 'ibschools' };

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => args.includes(`--${k}`);
const DRY = flag('dry');
const USE_WIKIDATA = flag('wikidata');
const LIMIT = Number(arg('limit', '0')) || 0; // cap Wikidata lookups (0 = no cap)
const libArg = arg('lib', 'ibSchools');
const libs = libArg === 'all' ? Object.keys(LIB_FILE) : [libArg];

const splitCountries = (s) => String(s).split(',').map((c) => c.trim()).filter(Boolean);

// ---- dbtm slug → { categories, countries } -------------------------------
function loadDbtm() {
  const raw = JSON.parse(readFileSync(`${JSONS}/dbtm.json`, 'utf8'))[0];
  const bySlug = new Map();
  for (const r of raw) {
    if (!r.url) continue;
    bySlug.set(r.url, {
      categories: r.categories ? String(r.categories) : undefined,
      countries: r.countries ? splitCountries(r.countries) : undefined,
    });
  }
  return bySlug;
}

// ---- Wikidata P31 → entityType (subset of ghp/sources P31_ENTITY_TYPE) ----
const P31_ENTITY_TYPE = {
  Q5: 'person', Q95074: 'person', Q15632617: 'person',
  Q515: 'place', Q3957: 'place', Q6256: 'place', Q5107: 'place', Q484170: 'place',
  Q262166: 'place', Q23442: 'place', Q8502: 'place', Q23397: 'place', Q4022: 'place',
  Q16970: 'place', Q41176: 'place', Q811979: 'place',
  Q1190554: 'event', Q198: 'event', Q178561: 'event', Q180684: 'event', Q1656682: 'event', Q50386913: 'event',
  Q11424: 'work', Q571: 'work', Q7725634: 'work', Q7366: 'work', Q134556: 'work', Q482994: 'work',
  Q7889: 'work', Q3305213: 'work', Q838948: 'work', Q105543609: 'work', Q47461344: 'work',
  Q28877: 'concept', Q23955: 'concept', Q133436: 'concept', Q2996394: 'concept', Q12737077: 'concept', Q41710: 'concept',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// slug → wdId, via Wikipedia pageprops
async function slugsToWikidataIds(slugs) {
  const out = new Map();
  for (let i = 0; i < slugs.length; i += 50) {
    const batch = slugs.slice(i, i + 50);
    const titles = batch.map(encodeURIComponent).join('|');
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&origin=*&titles=${titles}`);
      const data = await res.json();
      const norm = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
      const redir = new Map((data.query?.redirects ?? []).map((n) => [n.to, n.from]));
      for (const p of Object.values(data.query?.pages ?? {})) {
        const wd = p.pageprops?.wikibase_item;
        if (!wd) continue;
        let title = p.title;
        title = redir.get(title) ?? title;
        title = norm.get(title) ?? title;
        out.set(title.replace(/ /g, '_'), wd);
      }
    } catch { /* skip batch */ }
    await sleep(300);
  }
  return out;
}

// wdId → { type, countries[] }
async function fetchWikidataFacets(wdIds) {
  const facets = new Map();
  const countryQids = new Set();
  for (let i = 0; i < wdIds.length; i += 50) {
    const batch = wdIds.slice(i, i + 50);
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json&origin=*`);
      const data = await res.json();
      for (const [wd, ent] of Object.entries(data.entities ?? {})) {
        const p31 = ent.claims?.P31?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
        const cqs = (ent.claims?.P17 ?? []).map((c) => c?.mainsnak?.datavalue?.value?.id).filter(Boolean);
        cqs.forEach((q) => countryQids.add(q));
        facets.set(wd, { type: p31 ? (P31_ENTITY_TYPE[p31] ?? 'other') : 'other', countryQids: cqs });
      }
    } catch { /* skip */ }
    await sleep(300);
  }
  const label = new Map();
  const qids = [...countryQids];
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=labels&languages=en&format=json&origin=*`);
      const data = await res.json();
      for (const [q, ent] of Object.entries(data.entities ?? {})) {
        const l = ent.labels?.en?.value;
        if (l) label.set(q, l);
      }
    } catch { /* skip */ }
    await sleep(300);
  }
  for (const f of facets.values()) f.countries = f.countryQids.map((q) => label.get(q)).filter(Boolean);
  return facets;
}

// Insert facet keys into an entry's existing line, before the td object's
// closing brace — leaves all other bytes untouched. `adds` is an ordered
// object of { key: value }.
function insertFacets(line, adds) {
  const suffix = Object.entries(adds).map(([k, v]) => `,${JSON.stringify(k)}:${JSON.stringify(v)}`).join('');
  // The td object is the 2nd array element; its closing `}` is the last `}`
  // before the line's closing `]` (with optional trailing comma).
  return line.replace(/\}(\],?)\s*$/, `${suffix}}$1`);
}

async function enrichLib(lib, dbtm) {
  const prefix = LIB_FILE[lib];
  if (!prefix) { console.error(`unknown library "${lib}" (expected ${Object.keys(LIB_FILE).join('|')})`); return; }
  const file = `${TOS}/${prefix}TimeData.json`;
  const text = readFileSync(file, 'utf8');
  const entries = JSON.parse(text);

  // ---- decide facets per key (on parsed data) ----
  const addsByKey = new Map(); // key → ordered {categories?, countries?, type?}
  let fromDbtm = 0;
  const gaps = [];
  for (const [key, td] of entries) {
    if (!td.url) continue;
    const hit = dbtm.get(td.url);
    if (hit && (hit.categories || hit.countries)) {
      const adds = {};
      if (hit.categories && td.categories === undefined) adds.categories = hit.categories;
      if (hit.countries && td.countries === undefined) adds.countries = hit.countries;
      if (Object.keys(adds).length) { addsByKey.set(key, adds); fromDbtm++; }
    } else if (!td.type || !td.countries) {
      gaps.push([key, td]);
    }
  }

  let fromWd = 0;
  if (USE_WIKIDATA && gaps.length) {
    let pool = gaps;
    if (LIMIT) pool = pool.slice(0, LIMIT);
    console.log(`  ${lib}: ${pool.length} gap td → Wikidata…`);
    const slug2wd = await slugsToWikidataIds(pool.map(([, td]) => td.url));
    const facets = await fetchWikidataFacets([...new Set(slug2wd.values())]);
    for (const [key, td] of pool) {
      const f = facets.get(slug2wd.get(td.url));
      if (!f) continue;
      const adds = addsByKey.get(key) ?? {};
      if (f.type && td.type === undefined && adds.type === undefined) adds.type = f.type;
      if (f.countries?.length && td.countries === undefined && adds.countries === undefined) adds.countries = f.countries;
      if (Object.keys(adds).length) { addsByKey.set(key, adds); fromWd++; }
    }
  }

  // ---- apply as minimal text edits, line by line ----
  let applied = 0;
  const seen = new Set();
  const outLines = text.split('\n').map((line) => {
    const m = line.match(/^\[(\d+),/);
    if (!m) return line;
    const key = Number(m[1]);
    const adds = addsByKey.get(key);
    if (!adds || seen.has(key)) return line;
    seen.add(key);
    const next = insertFacets(line, adds);
    if (next !== line) applied++;
    return next;
  });

  console.log(`${lib}: ${entries.length} td | dbtm ${fromDbtm} | wikidata ${fromWd} | lines edited ${applied}`);
  if (!DRY) { writeFileSync(file, outLines.join('\n'), 'utf8'); console.log(`  wrote ${file}`); }
  else console.log('  (dry run — not written)');
}

const dbtm = loadDbtm();
console.log(`dbtm slugs: ${dbtm.size}${USE_WIKIDATA ? ' | Wikidata gap-fill ON' : ' | offline (dbtm only)'}${DRY ? ' | DRY' : ''}`);
for (const lib of libs) await enrichLib(lib, dbtm);
