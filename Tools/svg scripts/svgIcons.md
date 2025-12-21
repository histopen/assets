# SVG Icons

Source format: SVG, monochrome.

| Type | Count | Location | Renderer |
|------|-------|----------|----------|
| Historical | ~350 (→1000) | `Icons/TM_Icons/` | PIXI.js (WebGL) |
| UI | ~52 | `Icons/UI_*/` | React/CSS |

---

## Phase 1: UI Sprite (execute this phase)

**Goal:** Replace individual `<img>` fetches with single sprite file + Icon component.

### Step 1.1: Add sprite URL to defaults.ts

**File:** `ghp/core/src/Settings/defaults.ts`

Add `iconsUrl` and `spriteUiUrl` to `URL_DEFAULTS`.

### Step 1.2: Create build script

**File:** `assets/Tools/svg scripts/buildUiSprite.mjs`

Script that:
- Scans folders: `UI_Debug`, `UI_flags`, `UI_Social`, `UI_SourceNavbar`, `UI_Sources`, `UI_Toolbar`
- Extracts each SVG's viewBox and inner content
- Wraps each as `<symbol id="filename">...</symbol>`
- Combines into single `<svg>` with `style="display:none"`
- Optimizes with SVGO
- Outputs to `Icons/sprites-ui.svg`

**Run:** `node "Tools/svg scripts/buildUiSprite.mjs"`

### Step 1.3: Create Icon component

**File:** `client/src/components/Shared/Icon/Icon.tsx`

React component that:
- Takes `name`, `size`, `className` props
- Renders `<svg><use href="...sprites-ui.svg#name"/></svg>`
- Uses `URL_DEFAULTS.spriteUiUrl` for the sprite URL

### Step 1.4: Update ButtonsDisplay

**File:** `client/src/components/Shared/ButtonsDisplay/ButtonsDisplay.tsx`

- Import new `Icon` component
- Replace `<img src={...}>` with `<Icon name={iconId} />`

### Step 1.5: Update buttonsConfig.json

**File:** `assets/Jsons/buttonsConfig.json`

- Replace `imgPath` + `imgFileName` with single `iconId` field
- Example: `"iconId": "search"` instead of `"imgPath": "UI_Toolbar", "imgFileName": "search.svg"`

### Output

- **Sprite:** `assets/Icons/sprites-ui.svg`
- **URL:** `https://raw.githubusercontent.com/histopen/assets/main/Icons/sprites-ui.svg`

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
