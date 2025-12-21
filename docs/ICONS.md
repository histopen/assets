# SVG Icons

Source format: SVG, monochrome.

| Type | Count | Location | Renderer |
|------|-------|----------|----------|
| Historical | ~350 (→1000) | `Icons/TM_Icons/` | PIXI.js (WebGL) |
| UI | ~52 | `Icons/UI_*/` | React/CSS |

---

## UI Sprites

### 1) add a sprite

### 2) run script "npm run sprite":
- Scans folders: `UI_Debug`, `UI_flags`, `UI_Social`, `UI_SourceNavbar`, `UI_Sources`, `UI_Toolbar`
- Extracts each SVG's viewBox and inner content
- Wraps each as `<symbol id="filename">...</symbol>`
- Combines into single `<svg>` with `style="display:none"`
- Optimizes with SVGO
- Outputs to `Icons/sprites-ui.svg`

## UI Buttons

### 1) update Buttons in [google sheet: Buttons](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc/edit?gid=0#gid=0)

### 2) run script "npm run btn"
- it creates `assets/Jsons/buttonsConfig.json`

---

## Phase 2: PIXI Texture Caching (later)

Create shared texture cache to prevent duplicate loads for same icon.

---

## Phase 3: PIXI Texture Atlas (later)

When scaling to 1000 icons: convert to PNG atlas with TexturePacker.

---

## Tools

- **SVGO:** `npx svgo -r -f ./Icons`
- **Existing:** `Tools/svg scripts/recenteresizeformat/transform.mjs`

## References

- [SVGO](https://github.com/svg/svgo) | [PIXI Assets](https://pixijs.download/release/docs/assets.Assets.html) | [TexturePacker](https://www.codeandweb.com/texturepacker)
