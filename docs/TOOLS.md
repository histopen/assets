# Assets Tools

## Scripts Summary

`npm run` : atlas - sprite - tm - loc - loc en - btn - tv - cosmos - dbtm

| Category | npm run command | Google Sheet | Type | Description | File Output |
|----------|-----------------|--------------|------|-------------|-------------|
| btn | `npm run btn` | [sheet](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc) | svg+json | UI buttons (runs <br> script 'sprite' first) | sprites-ui.svg<br>buttonsConfig.json |
| loc | `npm run loc`<br>`npm run loc en` | [sheet](https://docs.google.com/spreadsheets/d/122F4RZYbeBNl10tjWZYjimDzUazSMN1jyQaatOtxSR8) | json | localization strings | Jsons/language/en.json, etc. |
| tv | `npm run tv` | [sheet](https://docs.google.com/spreadsheets/d/1-aKx4qxKP-cK0Tq5XyMW0G4fa_BBc8go6cWh8kyYydI) | json | timeview buttons | Jsons/tvConfig.json |
| cosmos | `npm run cosmos` | [sheet](https://docs.google.com/spreadsheets/d/1pWIrnNb7jKis5M0ftDJ9CvAgVUytXaKW41-dquWfS5I) | json | space levels | Jsons/cosmos.json |
| dbtm | `npm run dbtm` | [sheet](https://docs.google.com/spreadsheets/d/1OGOFf6rSTcJCxB9-EVVoeDD6fp9_ZVbqdN9mx2IeUzo) | json | database of timeMarks<br>(dbtm) | Jsons/dbtm.json |
|||||||
| tm | `npm run tm` | N/A | svg | timeMarks SVG tool | TimelineAtlas/target/*.svg |
| atlas | `npm run atlas` | N/A | svg | timeline icons atlas | TimelineAtlas/Atlas/ *.json<br>TimelineAtlas/Atlas/ *.png |
|||||||
| sprite | `npm run sprite` | N/A | svg | UI icons sprite | Icons_UI/sprites-ui.svg |


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
3. move it in `TimelineAtlas/source/`
4. `npm run tm`  
   what it does:
    a. Normalize colors to monochrome (#000000) if multiple colors detected
    b. Resize to fit 400×200 (2:1 aspect ratio)
    c. Center visual content within viewBox
    d. Minify with SVGO

5. icon is now in `TimelineAtlas/target/`

B) prepare atlas
1. move icon in `TimelineAtlas/target/`
2.  `npm run atlas`  
   what it does:  
   a. generates** `TimelineAtlas/Atlas/tMIconMap.json` from SVG files
   b. from SVG icons in `TimelineAtlas/TM_Icons/` creates PIXI.js texture atlases (4096x4096 atlas grid with 4px padding):     `TimelineAtlas/Atlas/`: `timeline-atlas-{size}.png` + `timeline-atlas-{size}.json` (PIXI spritesheet metadata) at 4 sizes: 128x64, 96x48, 64x32, 32x16

---

## Add a new UI icon

1. Add SVG to any `Icons_UI/UI_*/` folder
2. Run `npm run sprite` (or `npm run btn` which runs sprite first)

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
1. Runs `npm run sprite` to rebuild UI sprite
2. Fetches button config from [Google Sheet](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc)
3. Saves to `Jsons/buttonsConfig.json`
4. Commits and pushes both `sprites-ui.svg` and `buttonsConfig.json`

## References

- [SVGO](https://github.com/svg/svgo) | [PIXI Assets](https://pixijs.download/release/docs/assets.Assets.html) | [TexturePacker](https://www.codeandweb.com/texturepacker)
