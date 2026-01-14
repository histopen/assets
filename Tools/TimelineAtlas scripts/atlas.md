# Timeline Atlas Builder

Converts a set of SVG icons into texture atlases (spritesheets) in multiple sizes.

## Output
- PNG atlas images: `timeline-atlas-{size}.png`
- JSON metadata: `timeline-atlas-{size}.json`
- Icon map: `tMIconMap.json`
- Output directory: `TimelineAtlas/Atlas/`

---

## Usage
Run the script from the project root:
`npm run atlas` will create the files and commit/push
`npm run atlas-n` only creates files (no git)

---

## Configuration
Configuration is set in the script:
- **Atlas sizes:** `[128, 96, 64, 32]` (width, height is always width/2)
- **Atlas dimensions:** 4096x4096 px
- **SVG source directory:** `TimelineAtlas/TM_Icons/`
- **Output directory:** `TimelineAtlas/Atlas/`

---

## How Icon Inclusion Works

Icons are **auto-discovered** from `TimelineAtlas/TM_Icons/`. The script automatically generates `tMIconMap.json`.

### Validation Rules
An SVG is included only if:
1. **Filename pattern:** `NNNN-name.svg` (starts with 4 digits + hyphen)
2. **Aspect ratio:** 2:1 (e.g., width=400, height=200)

Files that don't meet these criteria are excluded and listed in warnings at the end of the build.

---

## Adding New Icons
1. Place your new SVG file in `TimelineAtlas/TM_Icons/`
   - Name it `NNNN-name.svg` (e.g., `0109-myicon.svg`)
   - Ensure 2:1 aspect ratio
2. Run `npm run atlas`
3. Check output for any warnings about excluded files

---

## Build Process Overview
1. Scans `TM_Icons/` for SVG files
2. Validates each file (filename pattern + aspect ratio)
3. Generates `tMIconMap.json` with valid icons
4. Renders each SVG to PNG at each target size
5. Converts colored icons to white (for PIXI tinting)
6. Arranges icons in a grid with padding
7. Outputs PNG atlas and JSON spritesheet for each size
8. Prints warnings about excluded files

---

## Troubleshooting
- If an icon does not appear, check the warnings at the end of build output
- Common issues:
  - Filename doesn't start with 4 digits + hyphen
  - Aspect ratio is not 2:1
- The atlas size and icon count are limited by the 4096x4096 atlas dimensions

---

## Extending or Customizing
- To change atlas sizes, edit the `ATLAS_SIZES` array in the script
- To change the atlas dimensions, update `atlasWidth` and `atlasHeight` in the config
- To change validation rules, modify the `validateSvg()` function

---

## Prerequisites
- Node.js (v16+ recommended)
- Dependencies: Install with `npm install` in the project root (requires `@resvg/resvg-js` and `sharp`)
