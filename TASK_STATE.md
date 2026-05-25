# Task State — Phase 4 (Rotation Drag)

## Goal
Add rotation drag to `Select2D` — drag the top-center rotation handle to rotate children around the bounding box center.

## Decisions
- **Rotated polygon bounding box**: replaced axis-aligned `strokeRect` with polygon drawn via `moveTo`/`lineTo`/`closePath`, so the selection frame rotates with children.
- **Point-in-polygon hit-test**: box hover/drag detection uses `pointInConvexPolygon` instead of axis-aligned bounds.
- **Rotation handle edge**: attached to world-maxY edge (screenCorners[3]→[2]), outward normal computed via dot product with polygon center — handle rotates with box.
- **Rotate-before-translate compose order**: `compose(translateTx, toCenter, rotZ, fromCenter, parent)` so rotation center is unionBounds center regardless of dragDelta.
- **Corners numbering**: screenCorners[0]=world(minX-p, minY-p) → screen bottom-left after Y-negation; screenCorners[3]=world(minX-p, maxY+p) → screen top-left.

## Changed Files

### `packages/ts-geosolid-canvas/src/select-2d.tsx`
- Added `pointInConvexPolygon()` helper
- Added `rotationAngle` signal, `rotating` flag, `rotInitAngle` tracking
- `onPointerDown`: handle hit i===4 starts rotation, records screen center → pointer angle
- `onPointerMove`: during rotation, computes angle delta → updates `rotationAngle`
- `onPointerUp`: clears rotation mode
- `childViewport`: composes `toCenter, rotZ, fromCenter` around `unionBounds` center, then `translateTx`
- Draw effect: polygon (moveTo/lineTo) + connector line to rotated top edge + handles at rotated corners
- `selRefs.positions[0-3]` = rotated screen corners, `[4]` = rotation handle above outward normal
- Removed `sMinX`/`sMinY`/`sMaxX`/`sMaxY` from `SelectionRefs`
- `createPointerMoveHandler` uses polygon hit-test
- Import: added `Rotation`

### `packages/ts-geosolid-canvas/tests/select-2d.test.tsx`
- Added closePath to mock CanvasRenderingContext2D
- 2 new tests: rotation starts on handle hit, rotation not started on corner handle
- Updated existing tests: check beginPath/stroke instead of strokeRect; check moveTo for union bounds

### `packages/ts-geosolid-canvas/readme.md`
- Updated Select2D description with rotation drag
- Updated Features list
- Bumped version 0.3.0 → 0.4.0

### `packages/ts-geosolid-canvas/package.json`
- Bumped version 0.3.0 → 0.4.0

## Tests
All 30 pass. New rotation tests:
- **starts rotation drag on rotation handle hit** — pointerdown at rotation handle → setPointerCapture(1)
- **does not start rotation drag on corner handle hit** — pointerdown at corner handle → no capture

## Unresolved Issues
- None
