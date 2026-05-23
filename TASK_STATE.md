# Task State — Ticket #52

## Goal
Add `Translate2D` SolidJS component that translates children by a 2D offset on canvas, analogous to `Rotation2D` but for translation.

## Decisions
- **`vector` prop over `dx`/`dy`**: Uses `Vector` from `@micurs/ts-geopro` for consistency with geo-entity types.
- **Y-negation**: Same as `Rotation2D.center` — `vector` is in screen coords (Y-down) but `Transform.fromTranslation` operates in world/mathematical coords (Y-up).
- **Context-provider pattern**: Follows `Rotation2D` exactly — `createMemo` for transformed viewport, `createEffect` for `requestRedraw`, passes through parent's `redrawVersion`/`requestRedraw`/`rAFWillClear`.
- **Animated demo**: Ellipse slides horizontally back and forth between -100 and +100, direction reversals at thresholds to visually prove translation works.

## Changed Files

### `packages/ts-geosolid-canvas/src/translate-2d.tsx`
- New `Translate2D` component with `vector: Vector` and `children: JSX.Element` props
- `createMemo` computes modified viewport via `compose(translateTx, vp.transform)`
- `createEffect` calls `ctx?.requestRedraw()` when `vector` changes
- Context provider passes `vp: translatedVp` + parent signals

### `packages/ts-geosolid-canvas/src/index.ts`
- Added export for `Translate2D` and `Translate2DProps`

### `packages/ts-geosolid-canvas/tests/translate-2d.test.tsx`
- New test file with 4 tests (see Tests section)

### `packages/ts-geosolid-canvas/demo/main.tsx`
- Added `Translate2D` import
- Added `Vector` import (from `@micurs/ts-geopro`)
- Added `tx` signal with `dir` variable for oscillation
- Added interval driving `tx` between -100 and +100 with direction reversal
- Added `Translate2D` wrapping an `Ellipse` inside Canvas

## Tests
1. **applies vector translation to viewport transform** — checks `direct(3,0)` and `direct(3,1)` match `Transform.fromTranslation(v.x, -v.y, 0)`
2. **zero vector produces identity translation offset** — translation part remains 0
3. **requests redraw when vector changes** — verifies `requestRedraw()` called on each `vector` change
4. **applies Y-negation to vector** — Y=100 screen coords → translation.y = -100 world

## Unresolved Issues
- None
