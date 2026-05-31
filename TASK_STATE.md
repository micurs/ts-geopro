# Task State — Phase 4 (Scale + Rotation)

## Goal
Frame-based scale resize for Select2D with live visual feedback, correct rotation pivot under Y-negated render.

## Decisions
- **Rotation is virtual**: stays in `childViewport` transform, not committed to children.
- **Axis-aligned scale + center rotation**: scale factors computed in un-rotated box space via screen→world through `compose(rotationAround(angle, cx, cy), baseTx)`. The rotation is applied around the ORIGINAL box center during drag (via `rotationAround`), so box stays rectangular and dragged corner follows the mouse exactly. On commit, `scaleCommitTranslation` compensates for the new center.
- **Y-flip in rotationAround**: `T(-px, py)·Rz·T(px, -py)` instead of naive `T(-px,-py)·Rz·T(px,py)`. Without this, the rendered rotation pivoted Y-reflected (e.g. box appeared to rotate one height above its center).
- **2-point numeric solve** for commit translation: samples the commit render pipeline at 3 points (0, e₁, e₂) and solves the affine system for the (dx, dy) that pins the pivot where the drag placed it.
- **Padding is purely visual, never scaled**: scale factors + commit use the UNPADDED child box. The selection outline + handles render the unpadded *scaled* corners through `M`, then add CONSTANT screen-space padding (`p / scaleFactor`) along the box's rotated local axes. Padding must NOT pass through the childViewport transform `M` — otherwise `Sax` scales it and the handle drifts off the cursor as the box resizes.
- **Delta-based scale factors**: `nSx = capturedScale + worldDelta / lc` where `worldDelta` = mouse movement since pointerdown (through `axisTx`, which excludes `Sax`). Absolute `worldMouse` through `axisTx` is wrong once `scaleDelta ≠ [1,1]` because the render includes `Sax` but `axisTx` doesn't (Sax-sandwich distortion). The relative delta cancels both the distortion and the constant padding offset.

## Changed Files

### `packages/ts-geosolid-canvas/src/select-2d.tsx`
- Added `rotationAround(angle, px, py)` — Y-flip fix so pivot is a true fixed point under transposed+Y-negated render
- Added `applyWorldStandard(T, x, y)` — apply transform using gl-matrix column-major convention
- Added `buildScaleChildTransform(baseTx, angle, cx, cy, pivotAxis, sx, sy)` — axis-aligned scale + center rotation + screen-space pin (exported for testing)
- Added `scaleCommitTranslation(baseTx, angle, cx, cy, box, pivotAxis, sx, sy)` — 2-point solve for release-jump elimination (exported for testing)
- Replaced frame-based scale (`Point.relative(Frame)`) with axis-aligned box space: `scalePivotAxis`, `scaleLocalCorner`, `scaleCenter`, `scaleBox`
- `childViewport` memo: uses `buildScaleChildTransform` during scale, `rotationAround` for rotation-only
- `onPointerDown`: captures axis-aligned corners + pivot + center, no Frame construction
- `onPointerMove`: un-rotates mouse through `rotationAround` to compute axis-aligned scale factors
- `onPointerUp`: dispatches `scale` commit, then if angle≠0 dispatches `translate` commit via `scaleCommitTranslation`
- Imports: removed `Frame`, `Point`, `Rotation`, `Vector`

### `packages/ts-geosolid-canvas/tests/select-2d.test.tsx`
- Removed old frame-based tests (axis corners relative to Frame, scale factors via Frame)
- Added "rotated scale: drag invariants + no release jump" suite: 36 parameterized tests (2 viewports × 4 angles × 4 corners) + 1 identity test
- Each test asserts: rectangularity, pinned pivot, dragged corner follows mouse, no release jump (committed pivot matches drag pivot to sub-0.1px)
- Imports: added `buildScaleChildTransform`, `scaleCommitTranslation`; removed `Frame`, `Point`, `Rotation`, `Vector`

## Tests
68 pass (45 in select-2d). Scale invariants suite: 36 parameterized + 1 identity.

## Unresolved Issues
- None
