# Assets Tools

## Scripts Summary

`npm run` : **tl** - atlas - ui - tmconvert - loc - loc en - btn - tv - cosmos - dbtm

| Category | npm run command | Google Sheet | Type | Description | File Output |
|----------|-----------------|--------------|------|-------------|-------------|
| **tl** | **`npm run tl`** | N/A | pipeline | **Full TL pipeline** (see below) | dbtm.json + TM_Icons + Atlas |
| btn | `npm run btn` | [sheet](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc) | svg+json | UI buttons (runs <br> script 'ui' first) | sprites-ui.svg<br>buttonsConfig.json |
| loc | `npm run loc`<br>`npm run loc en` | [sheet](https://docs.google.com/spreadsheets/d/122F4RZYbeBNl10tjWZYjimDzUazSMN1jyQaatOtxSR8) | json | localization strings | Jsons/language/en.json, etc. |
| tv | `npm run tv` | [sheet](https://docs.google.com/spreadsheets/d/1-aKx4qxKP-cK0Tq5XyMW0G4fa_BBc8go6cWh8kyYydI) | json | timeview buttons | Jsons/tvConfig.json |
| cosmos | `npm run cosmos` | [sheet](https://docs.google.com/spreadsheets/d/1pWIrnNb7jKis5M0ftDJ9CvAgVUytXaKW41-dquWfS5I) | json | space levels | Jsons/cosmos.json |
| dbtm | `npm run dbtm` | [sheet](https://docs.google.com/spreadsheets/d/1OGOFf6rSTcJCxB9-EVVoeDD6fp9_ZVbqdN9mx2IeUzo) | json | database of timeMarks<br>(dbtm) | Jsons/dbtm.json |
|||||||
| tmconvert | `npm run tmconvert` | N/A | svg | timeMarks SVG tool | Icons_TimeMarks/target/*.svg |
| atlas | `npm run atlas`<br>`npm run atlas:all` | N/A | svg | timeline icons atlas<br>(default: 128x64)<br>(all: 128x64, 96x48, 64x32, 32x16) | Icons_TimeMarks/Atlas/ *.json<br>Icons_TimeMarks/Atlas/ *.png |
|||||||
| ui | `npm run ui` | N/A | svg | UI icons sprite | Icons_UI/sprites-ui.svg |


---

## TL Pipeline (`npm run tl`)

Fast update of timeline elements in one command. Replaces running dbtm + tmconvert + atlas separately.

### Steps
1. **dbtm** — fetches timemarks DB from Google Sheet → `Jsons/dbtm.json`
2. **tmconvert** *(if SVG/PNG files are in `source/`)* — normalizes, resizes, centers icons
3. If tmconvert succeeds:
   - **Backup** — moves source files to `Icons_TimeMarks/BACKUP tm_icons/YYYY-MM-DD/`
   - **Update TM_Icons** — removes any existing icon with the same 4-digit prefix (conflict or rename), moves converted icons from `target/` to `TM_Icons/`
   - **atlas** — rebuilds texture atlas from all icons in `TM_Icons/`
4. **Single git commit + push** — `update dbtm` or `update dbtm + N TM icon(s)`

### Notes
- Uses `-n` (no-commit) variants of dbtm and atlas internally; does one combined commit at the end
- If no SVG/PNG in `source/`, steps 2-3 are skipped (dbtm only)
- If tmconvert fails, icon steps are skipped but dbtm is still committed
- `leave.me.here` and other non-SVG/PNG files in `source/` are ignored

---
## Do NOT edit json files => a) Edit Sheet b) run npm script
npm scripts create files and commit/push

Use `-n` suffix to skip commit/push:
`npm run dbtm` creates dbtm.json then commits/push
`npm run dbtm-n` only creates dbtm.json


## Add Timemarks (displayed in the timeline)

A) prepare icon
1. create an svg
2. Filename: `NNNN-name.svg` (4 digits + hyphen + name)
3. move it in `Icons_TimeMarks/source/`
4. `npm run tmconvert`
   what it does:
    a. Normalize colors: white→transparent, other→white (#fff)
    b. Resize to fit 400×200 (2:1 aspect ratio)
    c. Center visual content within viewBox
    d. Minify with SVGO

5. icon is now in `Icons_TimeMarks/target/`

B) prepare atlas
1. move icon in `Icons_TimeMarks/target/`
2.  `npm run atlas` (or `npm run atlas:all` for all sizes)
   what it does:
   a. generates `Icons_TimeMarks/Atlas/tMIconMap.json` from SVG files
   b. from SVG icons in `Icons_TimeMarks/TM_Icons/` creates PIXI.js texture atlases (dynamic atlas grid with 1px padding):
      - `npm run atlas` (default): generates only `timeline-atlas-128.png` + `timeline-atlas-128.json` (128x64)
      - `npm run atlas:all`: generates all 4 sizes: 128x64, 96x48, 64x32, 32x16

---

## Add a new UI icon

1. Add SVG to any `Icons_UI/UI_*/` folder
2. Run `npm run ui` (or `npm run btn` which runs ui first)

### Process
1. Auto-discovers all `UI_*` folders in `Icons_UI/`
2. Extracts each SVG's viewBox and inner content
3. Wraps each as `<symbol id="filename">...</symbol>`
4. Combines into single `<svg>` with `style="display:none"`
5. Optimizes with SVGO
6. Outputs to `Icons_UI/sprites-ui.svg`

---

## Update UI button configuration.

1. edit google sheet (see table at the top) 
2. `npm run btn`

### Process
1. Runs `npm run ui` to rebuild UI sprite
2. Fetches button config from [Google Sheet](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc)
3. Saves to `Jsons/buttonsConfig.json`
4. Commits and pushes both `sprites-ui.svg` and `buttonsConfig.json`

## References

- [SVGO](https://github.com/svg/svgo) | [PIXI Assets](https://pixijs.download/release/docs/assets.Assets.html) | [TexturePacker](https://www.codeandweb.com/texturepacker)

---

## Future Improvements

### Icon preview page
Generate HTML page showing all TM_icons

### Flag SVG Consistency Checklist

When adding or updating flag icons in `Icons_UI/UI_flags/`, ensure they pass these 7 checks:

| # | Check | Standard |
|---|-------|----------|
| 1 | No explicit width/height | Omit (responsive) |
| 2 | ViewBox dimensions | `0 0 640 480` |
| 3 | Aspect ratio | 4:3 (640:480) |
| 4 | Origin position | Top-left (0,0) |
| 5 | id attribute | `flag-icons-xx` |
| 6 | Title element | None |
| 7 | xmlns:xlink | Only if needed for `<use>` |

**Example standard format:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-fr" viewBox="0 0 640 480">
  <path fill="#fff" d="M0 0h640v480H0z"/>
  ...
</svg>
```

### Other Ideas

- **SVG lint script**: Auto-validate all UI SVGs against consistency rules (viewBox, no width/height, etc.)
- **Flag conversion tool**: Script to normalize flags from various sources to standard 640x480 format
- **Sprite validation**: Check for duplicate symbol IDs in sprites-ui.svg
- **Atlas optimization**: Detect unused icons in atlas and report them
