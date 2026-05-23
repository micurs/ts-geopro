# Task State — Ticket #48

## Goal
Implement `Rotation2D` SolidJS component that rotates children around a center point on canvas, with proper full-scene redraws.

## Decisions
- **rAF-based redraw loop**: Single `requestAnimationFrame` loop in Canvas clears canvas and bumps `redrawVersion` once per frame. Eliminates double-clearing/double-redrawing from competing pipelines.
- **`needRedraw` flag**: rAF loop skips clear+redraw when nothing changed. `requestRedraw()` called by `draw()` (pan/zoom) and `Rotation2D`'s `createEffect` (angle change).
- **Synchronous drawing**: `buildCanvasComponent` uses `createRenderEffect` (not `createEffect`) so draws happen synchronously when signals change, before browser paint.
- **Rectangle `center` over `topLeft`**: `topLeft` was misleading due to Y-axis inversion (canvas +h goes world -y). Changed to `center` for unambiguous positioning.
- **Rotation center Y-negation**: Rotation center Y is negated in `fromTranslation` because `center` prop is in screen coords (Y-down) but `Transform.fromTranslation` operates in world/mathematical coords (Y-up).

## Changed Files

### `packages/ts-geosolid-canvas/src/canvas.tsx`
- Remove `triggerFullRedraw` / `lastRedrawTime` / throttle
- Remove `createRenderEffect` that cleared on redrawVersion change
- Add `requestAnimationFrame` loop with `needRedraw` flag: only clears + redraws when something changed
- `draw()` (pan/zoom/resize) no longer clears or sets transform — only updates viewport signal + calls `requestRedraw()`
- Remove unused `setupTransformation` / `clear` / `createSignal` from canvas-local scope
- [PR #49] Add `rAFWillClear` signal, set true before `redrawVersion` bump in rAF loop (fixes #382)
- [PR #49] Store `rafId` and call `cancelAnimationFrame` on `onCleanup` (fixes #380)
- [PR #49] Pass `rAFWillClear` through context object

### `packages/ts-geosolid-canvas/src/build-canvas-component.tsx`
- Switch from `createEffect` to `createRenderEffect` (synchronous drawing on signal change)
- Remove comments (style consistency)
- [PR #49] Check `rAFWillClear` in render effect; skip `requestRedraw()` during rAF processing (fixes #382)
- [PR #49 v2] Wrapped `rAFWillClear` read in `untrack()` to prevent tracking as reactive dependency — `setRAFWillClear(true/false)` no longer reruns effects, avoiding continuous redraw loop

### `packages/ts-geosolid-canvas/src/rotation-2d.tsx`
- Add `createEffect` that calls `ctx?.requestRedraw()` when angle changes
- Pass `requestRedraw` through context provider alongside `redrawVersion`
- [PR #49] Track `props.center` alongside `props.angle` in `createEffect` (fixes #378)
- [PR #49] Pass `rAFWillClear` through context provider

### `packages/ts-geosolid-canvas/src/canvas/canvas-context.ts`
- Add `requestRedraw` to `CanvasContextValue` interface
- [PR #49] Add `rAFWillClear` to `CanvasContextValue` interface

### `packages/ts-geosolid-canvas/src/canvas/types.ts`
- Add `requestRedraw` to `Options` interface

### `packages/ts-geosolid-canvas/src/rectangle.tsx`
- `RectangleProps.topLeft` → `center`. Draw computes tlX/tlY from center.

### `packages/ts-geosolid-canvas/tests/rotation-2d.test.tsx`
- Remove `triggerFullRedraw` from `contextStub`
- Remove unused `noop` helper
- [PR #49] Add `rAFWillClear` to `contextStub`

### `packages/ts-geosolid-canvas/demo/main.tsx`
- `Rectangle` uses `center` prop
- Two rotating groups: ellipse (origin) + rectangle (center)

### `demos/quadretti/src/App.tsx`
- `Rectangle` uses `center` prop (was still using old `topLeft`)
- Fixes build error

## PR #49 Review Fixes

### #382: rAFWillClear infinite needRedraw loop
- Added `rAFWillClear` signal to `CanvasContextValue`
- rAF loop sets `rAFWillClear = true` before bumping `redrawVersion`, `false` after
- `buildCanvasComponent` checks `rAFWillClear`: when true (rAF-triggered draw), skips `requestRedraw()`
- Component prop changes (color, width, center) → render effect draws + calls `requestRedraw()` → canvas clears + redraws → no stale pixels
- [PR #49 v2] Wrapped `rAFWillClear` read in `untrack()` to prevent tracking as reactive dependency — `setRAFWillClear(true/false)` no longer reruns effects, avoiding continuous redraw loop

### #380: Cancel rAF loop on cleanup
- `rafId: number | undefined` stores the rAF handle
- `onCleanup` calls `cancelAnimationFrame(rafId)` to stop loop on unmount

### #378: Track center in Rotation2D createEffect
- `createEffect` now reads `props.center` alongside `props.angle` → calls `requestRedraw` when center changes

### #376: Rectangle `topLeft` → `center` (documentation note)
- API break is intentional; will document in release notes

## Unresolved Issues
- None

## Next Steps
- User has a new idea to discuss
