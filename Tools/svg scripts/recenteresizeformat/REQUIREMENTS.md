# SVG Transformation Requirements Checklist

This document defines all requirements for the tmconvert transformation pipeline.

## Output Format Requirements

### ✅ Display Dimensions
- **MUST** have `width="400"`
- **MUST** have `height="200"`
- Aspect ratio: **2:1** (width:height)

### ✅ ViewBox Requirements
- **MUST** have 2:1 aspect ratio (e.g., `viewBox="x y 600 300"`)
- ViewBox width should be in the **range of 50-800 units** (similar to existing working icons)
- Too large viewBoxes (1000+) make content appear too small
- Too small viewBoxes (<50) reduce rendering quality

### ✅ Content Positioning & Scale
- Content **MUST** fill **70-99% of the constraining dimension** (width OR height)
  - Target is 97.5%, but complex icons may fill 70-95%
- Content **SHOULD** be reasonably centered within the viewBox
  - Margin difference should be < 45% of viewBox width
- ViewBox size should be reasonable (50-6000 units)
  - Prefer 400-800 range, but larger is acceptable for complex content

### ✅ Color Normalization
- **White fills/strokes MUST be preserved** (converted to `#ffffff` or `#fff`)
- **NEVER** set white elements to `fill="none"` (makes them invisible)
- All non-white colors normalized to `#ffffff` (for dark mode visibility)
- Black fills (`#000000`) → white (`#ffffff`)
- All other colors → white (`#ffffff`)

### ✅ Content Coverage
- Icons **MUST** occupy all available space
- No excessive empty space around content
- Content should be clearly visible when displayed at 400×200

## Validation Checklist

For each transformed icon, these criteria should be met:

- [ ] `width="400"` and `height="200"` (**REQUIRED**)
- [ ] ViewBox aspect ratio is exactly 2:1 (e.g., 600×300, 5554×2777) (**REQUIRED**)
- [ ] ViewBox dimensions are reasonable (50-6000 units) (**REQUIRED**)
- [ ] Content fills 96-99% of the constraining dimension (**TARGET: 97.5%**) (**STRICT**)
- [ ] Content is perfectly centered horizontally (< 1 unit margin difference) (**STRICT**)
- [ ] Content is perfectly centered vertically (< 1 unit margin difference) (**STRICT**)
- [ ] Content does not extend beyond viewBox (no clipping) (**STRICT**)
- [ ] No `fill="none"` attributes (0 instances) (**STRICT**)
- [ ] All colored fills normalized to `#ffffff` or `#fff` (**REQUIRED**)
- [ ] Icon is clearly visible and recognizable at 400×200 display size (**REQUIRED**)
- [ ] Reasonable margins (not excessive whitespace)
- [ ] Content visible (overlaps with viewBox)
- [ ] ViewBox size manageable (< 6000 units)
- [ ] File contains actual path data (not empty after SVGO minification) (**REQUIRED**)

## Reference: Working Icons

Check existing icons in `Icons_TimeMarks/TM_Icons/` for examples:

| Icon | ViewBox | Fill Pattern |
|------|---------|-------------|
| 0001-univ-milkyway.svg | 56×28 | fill="#fff", ~64% width, 100% height |
| 0010-life-oxygen.svg | 46×23 | ~50% width, 100% height |
| 0020-dino2-tRex.svg | 772.9×386.5 | ~60% width, 100% height |

All have:
- 2:1 viewBox aspect ratio
- Content fills ~100% of the constraining dimension
- Reasonable viewBox sizes
- White fills preserved

## Common Issues to Avoid

### ❌ DON'T:
- Create viewBoxes larger than 1000 units (content appears tiny)
- Remove white fills (sets to `fill="none"`, making icons invisible)
- Force content into tiny portion of viewBox (wasted space)
- Create negative offsets that clip content
- Leave content at original huge coordinates without scaling

### ✅ DO:
- Normalize viewBox to 50-800 range
- Scale content coordinates to match viewBox
- Preserve all white fills as `#ffffff`
- Make content fill 90%+ of constraining dimension
- Center content with small, equal margins
- Maintain strict 2:1 viewBox aspect ratio

## Transformation Pipeline

The transform.mjs script applies these transformations in order:

1. **Pre-process**: Simplify structure (remove clipPaths, defs, unwrap groups)
2. **Transform 0**: Normalize colors (white preserved as #fff, others → #fff)
3. **Transform 1**: Resize (scale to fit 400×200, proportional)
4. **Transform 2**: Bake transforms with SVGO (convertTransform, optimize file size)
5. **Transform 3**: Center (create 2:1 viewBox, scale & center content for 97.5% fill)

**IMPORTANT**: Transform 2 (SVGO) must run before Transform 3 (Center) so that transforms are baked into path coordinates before calculating the centered viewBox. Otherwise the viewBox would be sized for the wrong coordinate system.

**CRITICAL**: The bounds calculation includes BOTH `<path>` elements AND `<use>` elements (which reference paths defined in `<defs>`). SVG files often use `<use>` elements with transforms to reuse paths (e.g., for wheels on a car). These `<use>` elements can extend beyond the visible paths, so they must be included in the bounds calculation to prevent clipping.

## Testing

After running tmconvert, manually verify 2-3 random files:

1. Open SVG in browser
2. Check it's clearly visible at 400×200
3. Check it fills most of the space (no huge margins)
4. Check white elements are visible (not transparent)
5. Inspect viewBox attribute (should be ~600×300 or similar 2:1 ratio)

## Target Output Example

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     width="400"
     height="200"
     viewBox="-10 -5 600 300">
  <g transform="scale(0.104)">
    <path fill="#fff" d="M..."/>
  </g>
</svg>
```

- Display: 400×200 ✓
- ViewBox: 600×300 (2:1) ✓
- Content scaled and wrapped in group ✓
- White fill preserved ✓
