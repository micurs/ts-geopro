# Select2D — Multi-Phase Plan

**Ticket**: [#54](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/54)

**Package**: `@micurs/ts-geosolid-canvas`

---

## Overview

`Select2D` is a context-provider component (like `Rotation2D`/`Translate2D`)
that wraps children and renders a selection overlay with interactive handles.
Implemented in 5 phases, each producing a PR.

---

## Phase #1 — Select2D component + dashed bounding box

**Sub-ticket**: [#55](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/55)

**Branch**: `micurs/55-select-2d-bounding-box`

### Design

- **`selected` always active**: `Select2D` presence = selection is shown. No
  `selected` prop needed (added in later phases for filtering).
- **Pass-through context**: `Select2D` provides `canvasContext` unchanged + its
  own `selectionContext`.
- **Children register bounds**: each shape with `id` prop calls
  `useShapeBoundsRegistration(id, getBounds)` in its component body. Bounds are
  computed from geometry props (center±w/2, from/to min/max).
- **Draw with `createEffect`**: fires after children's `createRenderEffect`
  completes → selection rect drawn on top of shapes.
- **Bounding box style**: dashed line (`setLineDash([6, 4])`), `selectionColor`
  (`#00aaff`), `lineWidth` 2, `padding` 6px.
- **Known limitation**: shapes inside `Rotation2D`/`Translate2D` within
  `Select2D` register raw geometry bounds — rect misaligned. Accepted for Phase
  #1.

### Files

| Action | File                       | Content                                                                                                                                                                                                                                                                                                    |
| ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create | `src/canvas/selection.ts`  | `BoundingBox` type (`minX/maxX/minY/maxY`), `SelectionContextValue` interface (`registerBounds`, `unregisterBounds`, `bounds`), `selectionContext` (default no-op), `useShapeBoundsRegistration(id?, getBounds)` helper — bridges Select2D ↔ child shapes so Select2D knows where to draw the bounding box |
| Create | `src/select-2d.tsx`        |                                                                                                                                                                                                                                                                                                            |
| Modify | `src/ellipse.tsx`          |                                                                                                                                                                                                                                                                                                            |
| Modify | `src/rectangle.            |                                                                                                                                                                                                                                                                                                            |
| Modify | `src/line.tsx`             |                                                                                                                                                                                                                                                                                                            |
| Modify | `src/index.ts`             |                                                                                                                                                                                                                                                                                                            |
| Modify | `demo/main.tsx`            |                                                                                                                                                                                                                                                                                                            |
| Create | `tests/select-2d.test.tsx` |                                                                                                                                                                                                                                                                                                            |

**⚠️ STOP — DO NOT proceed to Phase #2 until this PR is approved and merged.
⚠️**

---

## Phase #2 — Handles + hover highlights

**Sub-ticket**: [#56](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/56)

**Branch**: `micurs/56-select-2d-handles`

**Changes**:

- Draw 5 handle circles (`r=4px`, white fill, `#333` stroke in screen coords):
  - 4 at corners of bounding box
  - 1 at top-center, 8px outside (rotation handle)
  - commit changes and allow user to verify results before implementing
    interactivity
- `pointermove` listener on canvas: track mouse → convert to world coords
  (`Point.from(sx, -sy, 0).unMap(vp.transform)`)
- Hit-test mouse against bounding rect → change line style (e.g., solid
  `#4488ff`)
- Hit-test mouse against each handle circle → fill matched handle yellow
- Register/unregister event listeners on mount/cleanup

**⚠️ STOP — DO NOT proceed to Phase #3 until this PR is approved and merged.
⚠️**

---

## Phase #3 — Translation drag

**Sub-ticket**: [#57](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/57)

**Branch**: `micurs/57-select-2d-translate`

**Changes**:

- `pointerdown` on bounding box (not on handles): start drag
- `pointermove` during drag: compute delta in world coords
- Apply delta as translation: Select2D modifies `vp.transform` for children via
  `compose(translateTx, vp.transform)` — same pattern as `Translate2D`
- `pointerup`: end drag, commit translation
- Translate delta tracked as internal signal
- Update version of `ts-geosolid-canvas`.

**⚠️ STOP — DO NOT proceed to Phase #4 until this PR is approved and merged.
⚠️**

---

## Phase #4 — Rotation drag

**Sub-ticket**: [#58](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/58)

**Branch**: `micurs/58-select-2d-rotate`

**Changes**:

- `pointerdown` on rotation handle: start rotation drag
- `pointermove`: compute angle between handle–center vector and current pointer
- Apply rotation delta to viewport: `compose(rotateTx, prevTransform)`
- Composited with translation from Phase #3

**⚠️ STOP — DO NOT proceed to Phase #5 until this PR is approved and merged.
⚠️**

---

## Phase #5 — Scale drag

**Sub-ticket**: [#59](http://gitea.micurs.com:3000/micurs/ts-geopro/issues/59)

**Branch**: `micurs/59-select-2d-scale`

**Changes**:

- `pointerdown` on corner handle: start scale drag
- `pointermove`: compute scale factor from center–handle distance change
- Different corners scale asymmetrically (x, y, or both)
- Apply scale: `compose(scaleTx, rotateTx, translateTx, vp.transform)`
