#!/usr/bin/env node
/**
 * TL Pipeline — Fast update of timeline elements
 *
 * 1. dbtm (no git)
 * 2. If SVG/PNG files in source/ → tmconvert
 * 3. If tmconvert ok:
 *    a. Move source icons to BACKUP tm_icons/YYYY-MM-DD/
 *    b. Remove TM_Icons files with same 4-digit number prefix (conflict or overwrite)
 *    c. Move target icons to TM_Icons/
 *    d. atlas (no git)
 * 4. Single git commit + push
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, renameSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR  = join(__dirname, '..');
const ASSETS_DIR = join(__dirname, '../..');
const SOURCE_DIR  = join(ASSETS_DIR, 'Icons_TimeMarks/source');
const TARGET_DIR  = join(ASSETS_DIR, 'Icons_TimeMarks/target');
const TM_ICONS_DIR = join(ASSETS_DIR, 'Icons_TimeMarks/TM_Icons');
const BACKUP_DIR  = join(ASSETS_DIR, 'Icons_TimeMarks/BACKUP tm_icons');

function run(cmd, cwd = TOOLS_DIR) {
  try { execSync(cmd, { cwd, stdio: 'inherit' }); return true; }
  catch { return false; }
}

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const getIconNum = (f) => { const m = f.match(/^(\d{4})-/); return m ? m[1] : null; };

// ── [1/4] dbtm ────────────────────────────────────────────────────────────────
console.log('\n━━━ [1/4] dbtm ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (!run('node jsontools/tooldbtm.js')) { console.error('❌ dbtm failed'); process.exit(1); }

// ── [2/4] tmconvert if source has SVG/PNG ─────────────────────────────────────
const sourceFiles = readdirSync(SOURCE_DIR).filter(f => /\.(svg|png)$/i.test(f));
const committedSvgs = []; // track what ends up in TM_Icons

if (sourceFiles.length === 0) {
  console.log('\n[2/4] No SVG/PNG in source — skipping icon steps');
} else {
  console.log(`\n━━━ [2/4] tmconvert (${sourceFiles.length} file(s) in source) ━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const tmOk = run('node "svg scripts/recenteresizeformat/transform.mjs"');

  if (!tmOk) {
    console.error('\n❌ tmconvert failed — icon steps skipped (dbtm will still commit)');
  } else {
    // Determine which source files were successfully converted (present in target as SVG)
    const targetFiles = new Set(readdirSync(TARGET_DIR).filter(f => /\.svg$/i.test(f)));
    const converted = sourceFiles.filter(f => targetFiles.has(f.replace(/\.png$/i, '.svg')));

    if (converted.length === 0) {
      console.log('\n⚠ No converted files found in target — skipping icon steps');
    } else {
      // ── [3a] Backup source ───────────────────────────────────────────────────
      console.log(`\n━━━ [3a] Backup ${converted.length} source file(s) → BACKUP tm_icons/${today()} ━━━`);
      const backupDay = join(BACKUP_DIR, today());
      if (!existsSync(backupDay)) mkdirSync(backupDay, { recursive: true });
      for (const f of converted) {
        renameSync(join(SOURCE_DIR, f), join(backupDay, f));
        console.log(`  ✓ ${f}`);
      }

      // ── [3b/c] Update TM_Icons ───────────────────────────────────────────────
      console.log(`\n━━━ [3b/c] Update TM_Icons (${converted.length} icon(s)) ━━━━━━━━━━━━━━━━━━━━━━━━━`);
      const tmIconFiles = readdirSync(TM_ICONS_DIR).filter(f => /\.svg$/i.test(f));
      for (const srcFile of converted) {
        const svgName = srcFile.replace(/\.png$/i, '.svg');
        const num = getIconNum(svgName);
        if (num) {
          // Remove all TM_Icons files with same number prefix (conflict or same-name overwrite)
          for (const existing of tmIconFiles) {
            if (existing.startsWith(`${num}-`)) {
              unlinkSync(join(TM_ICONS_DIR, existing));
              if (existing !== svgName) console.log(`  🗑 deleted conflict: ${existing}`);
            }
          }
        }
        renameSync(join(TARGET_DIR, svgName), join(TM_ICONS_DIR, svgName));
        console.log(`  ✓ moved: ${svgName}`);
        committedSvgs.push(svgName);
      }

      // ── [3d] atlas ───────────────────────────────────────────────────────────
      console.log('\n━━━ [3d] atlas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (!run('node "Icons_TimeMarks scripts/buildIcons_TimeMarks.mjs"')) {
        console.error('❌ atlas failed');
        process.exit(1);
      }
    }
  }
}

// ── [4/4] Single git commit ────────────────────────────────────────────────────
console.log('\n━━━ [4/4] git commit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const msg = committedSvgs.length > 0
  ? `update dbtm + ${committedSvgs.length} TM icon(s)`
  : 'update dbtm';

if (committedSvgs.length > 0) {
  // Stage all changes in assets repo: icons, atlas, backups, source deletions, script files
  // --ignore-errors skips locked OS files (e.g. open Office ~$ temp files)
  run('git -C .. add --ignore-errors -A');
} else {
  run('git -C .. add -f Jsons/dbtm.json');
}
const committed = run(`git -C .. commit -m "${msg}"`);
if (committed) {
  run('git -C .. push');
  console.log(`\n✅ Done! Committed: "${msg}"`);
} else {
  console.log('\n✅ Done! (nothing to commit)');
}
