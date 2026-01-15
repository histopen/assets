# SVG Recenter/Resize/Format Tool

Batch-transforms SVG icons for timeline atlas. Applies 4 transformations to all SVGs in `Icons_TimeMarks/source/` and writes results to `Icons_TimeMarks/target/`:

- **T0**: Normalize colors to monochrome (#000000) if multiple colors detected
- **T1**: Resize to fit 400×200 display (2:1 aspect) while preserving aspect ratio
- **T2**: Center visual content (path bounds) inside viewBox
- **T3**: Minify with SVGO, preserving `xmlns`

## Usage

```bash
npm run tm
```

Or directly:
```bash
node "Tools/svg scripts/recenteresizeformat/transform.mjs"
```

## Source/Target Folders

- **Source**: `Icons_TimeMarks/source/` - place input SVG files here
- **Target**: `Icons_TimeMarks/target/` - transformed output files

## Customization

Edit constants in `transform.mjs`:
- `TARGET_WIDTH`, `TARGET_HEIGHT` - target display size (default: 400×200)
- `TARGET_COLOR` - monochrome normalization color (default: #000000)

## Prerequisites

- Node.js (v16+ recommended)
- Dependencies: `npm install` in `Tools/` folder (requires `cheerio`, `svgo`, `svg-path-commander`)
