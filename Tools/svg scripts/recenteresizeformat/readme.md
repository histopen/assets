# SVG Recenter/Resize/Format Tool

This folder contains an automated tool to batch-transform SVG icons. The tool applies three transformations to all SVG files in `source/` and writes results to `target/`:

- Transform 1: Resize to fit a 400×200 display (2:1 aspect) while preserving aspect ratio.
- Transform 2: Center visual content (path bounds) inside viewBox and set the SVG width/height.
- Transform 3: Minify the resulting SVG with SVGO, preserving `xmlns`.

Files:
- `transform.mjs` — main ESM script (Node.js) that performs the three transforms.
- `source/` — put your input SVG files here.
- `target/` — output files are written here.

Prerequisites
-------------
- Node.js (v16+ recommended), A shell (Windows: PowerShell or bash).
The commands below assume the workspace root is the current working directory.

Customization
-------------

- To change the target display size, edit the constants at the top of `transform.mjs` (`TARGET_WIDTH`, `TARGET_HEIGHT`).
- To adjust which elements are considered, modify `getContentBounds()` inside `transform.mjs`.

Quick start
-----------

1. Open a terminal and change into the tool folder:

```bash
cd "Tools/svg scripts/recenteresizeformat"
```

2. Install dependencies. If this folder has a `package.json`, run:

```bash
npm install
```

If not, initialize and install the required packages:

```bash
npm init -y
npm install cheerio svgo svg-path-commander --save
```

3. Run the transformer:

Option A — run directly with Node.js:

```bash
node transform.mjs
```

Option B — use the npm script (recommended). From the repository root you can run:

```bash
npm run svg
```

This runs the script at `Tools/svg scripts/recenteresizeformat/transform.mjs` as a single command.

The script will:

- Copy files from `source/` into `target/`.
- Resize each SVG to the correct display size.
- Compute each icon's visual path bounds and center them within a 2:1 viewBox.
- Minify with SVGO and ensure `xmlns` remains present.

Notes & troubleshooting
-----------------------

- The script relies on `svg-path-commander` to compute a visual bounding box for path data (more visually accurate than some other methods that may include control-point extents).
- If icons appear left/right shifted compared to expectations, check whether the paths include transforms (e.g. `<g transform="translate(...)">`) or elements inside `<defs>`; the script skips paths inside `<defs>`.
- If dependencies are missing or import errors occur, ensure you ran `npm install` inside this folder (or at repo root) and restart the terminal.
