# Timeline Atlas Builder

converts a set of SVG icons into texture atlases (spritesheets) in multiple sizes.


## Output
- PNG atlas images: `timeline-atlas-{size}.png`
- JSON metadata: `timeline-atlas-{size}.json`
- Output directory: `TimelineAtlas/`

---


## Usage
Run the script from the project root: 
"npm run atlas" will create the files and commit/push
"Tools/TimelineAtlas scripts/buildTimelineAtlas.mjs"

---

## Configuration
Configuration is set in the script:
- **Atlas sizes:** `[128, 96, 64, 32]` (width, height is always width/2)
- **Atlas dimensions:** 4096x4096 px
- **SVG source directory:** `Icons/TM_Icons/`
- **Icon map file:** `Jsons/tMIconMap.json`
- **Output directory:** `TimelineAtlas/`

---

## How Icon Inclusion Works

Only icons listed in `Jsons/tMIconMap.json` are included in the atlas. This file maps numeric icon IDs to SVG filenames. Example:

```json
{
  "1": "icon1.svg",
  "2": "icon2.svg"
}
```

---

## Adding New Icons
1. Place your new SVG file in `Icons/TM_Icons/`.
2. Add a new entry to `Jsons/tMIconMap.json` with a unique numeric ID and the SVG filename.
3. Save the file.
4. Run the build script again. The new icon will be included in all atlas sizes.

---

## Build Process Overview
1. Loads the icon map and reads all mapped SVGs.
2. Renders each SVG to PNG at each target size.
3. Converts colored icons to white (for PIXI tinting).
4. Arranges icons in a grid with padding.
5. Outputs a PNG atlas and a JSON spritesheet for each size.

---

## Troubleshooting
- If an icon does not appear, ensure it is listed in `tMIconMap.json` and the filename matches exactly.
- Check the console output for warnings about missing files or errors during rendering.
- The atlas size and icon count are limited by the 4096x4096 atlas dimensions.

---

## Extending or Customizing
- To change atlas sizes, edit the `ATLAS_SIZES` array in the script.
- To change the atlas dimensions, update `atlasWidth` and `atlasHeight` in the config.
- To include all SVGs automatically, consider modifying the script to scan the SVG directory instead of using a map file.

---

## Prerequisites
- Node.js (v16+ recommended)
- Dependencies: Install with `npm install` in the project root (requires `@resvg/resvg-js` and `sharp`)

---
