# Frame-Based Scale for Rotated Select2D

**Package**: `@micurs/ts-geosolid-canvas`

**Depends on**: `@micurs/ts-geopro` (Frame, Point, Rotation, Transform, relative/absolute)

---

## Problem

When resizing a rotated `Select2D` by dragging a corner handle, the current
approach removes rotation from the viewport during scaling, computes
axis-aligned scale factors from un-rotated mouse deltas, and shows a
screen-space ghost overlay. On release the rotation is re-applied around the
new bounding-box center, which has shifted because the scale was anchored at
the opposite corner. This produces a visible jump — the final rotated box
doesn't match the ghost the user saw while dragging.

Root cause: the scale and rotation are handled in different coordinate spaces.
Scale happens in world-aligned axes; rotation happens around a center that
moves when the box changes size. No amount of post-commit translation
compensation fixes this cleanly because the two operations don't commute
through the transposed `worldToScreenPoint` convention.

---

## Solution

Use ts-geopro's `Frame` to define a **local coordinate system H** at the
rotated pivot corner, with axes aligned along the rotated box edges. All
scale math happens in H where:

- The pivot is the origin (stays fixed automatically).
- Mouse deltas along H's axes directly give scale factors.
- No manual un-rotation needed.
- The `childViewport` transform becomes `H.direct * S * H.inverse * base`,
  which is a proper affine transform that preserves rectangularity.

---

## Key Concepts

### Frame H (Home / Handle frame)

```
Origin:  the world position of the OPPOSITE corner (pivot)
X-axis:  unit vector along the box edge from pivot toward the adjacent corner
Y-axis:  unit vector along the other box edge from pivot
Z-axis:  world Z (unchanged for 2D)
```

When the selection is rotated by angle theta, H's axes are rotated by theta
relative to world axes. When the selection is NOT rotated, H's axes align
with the world axes and the behavior degenerates to the current axis-aligned
scale.

### Coordinate conversion

```ts
const H = Frame.from(
  Transform.fromRotoTranslation(
    Rotation.rotationZ(angle),
    Vector.from(pivotX, pivotY, 0)
  )
);

// World point -> H-local:  localP = worldP.relative(H)
// H-local -> world:        worldP = localP.absolute(H)
```

### Scale in H

In H-local coordinates, the dragged corner is at `(width, height, 0)` (or
negative, depending on which corner). The mouse position in H gives the new
corner position. Scale factors:

```
sx = localMouse.x / localCorner.x
sy = localMouse.y / localCorner.y
```

The scale transform in H is simply `S(sx, sy, 1)`.

### Viewport transform

The `childViewport` transform during scaling becomes:

```
childTx = H.toTransform() * S(sx, sy) * H.toTransform().inverse * translateTx * vp.transform
```

Which is equivalent to: transform children to H-local, scale, transform back
to world, then apply the base viewport. This works for ANY rotation angle
including zero.

---

## Detailed Steps

### Step 1: Add ts-geopro imports to select-2d.tsx

Add imports for `Frame`, `Point`, `Rotation`, `Vector` from `@micurs/ts-geopro`.
These are already dependencies of the package.

### Step 2: Create Frame H in onPointerDown

When the user clicks a corner handle `i`:

```ts
const angle = untrack(() => rotationAngle());
const opp = scaleInitWorldCorners[(i + 2) % 4]!;
const pivotWorld = Point.from(opp[0], opp[1], 0);

// Frame at pivot, rotated by selection angle
const H = Frame.from(
  Transform.fromRotoTranslation(
    Rotation.rotationZ(angle),
    Vector.from(opp[0], opp[1], 0)
  )
);
```

Store `H` and the dragged corner's position in H-local coords:

```ts
const cornerWorld = Point.from(scaleInitWorldCorners[i]![0], scaleInitWorldCorners[i]![1], 0);
const cornerLocal = cornerWorld.relative(H);
// cornerLocal.x = box width (signed), cornerLocal.y = box height (signed)
```

Store: `scaleFrame = H`, `scaleLocalCorner = [cornerLocal.x, cornerLocal.y]`.

### Step 3: Replace mouse un-rotation in onPointerMove

Currently the code un-rotates `(rawDx, rawDy)` by `-angle` to get axis-aligned
deltas. Replace with:

1. Convert raw screen mouse position to world coordinates using the inverse
   viewport transform (parent vp).
2. Convert the world mouse position to H-local: `localMouse = worldMouse.relative(H)`.
3. Compute scale factors: `sx = localMouse.x / scaleLocalCorner.x`,
   `sy = localMouse.y / scaleLocalCorner.y`.
4. Clamp to `>= 0.01`.
5. `setScaleDelta([sx, sy])`.

Note: converting screen to world requires inverting the parent viewport
transform. Use `parentVp.transform.inverseMatrix` or `Point.from(wx, wy, 0).unMap(parentVp.transform)`.

Actually, for the screen-to-world conversion we need the inverse of
`translateTx * parentVp.transform`. We can compute the world mouse as:

```ts
const baseTx = compose(translateTx, parentVp.transform);
// baseTx maps world -> screen (through the transposed convention)
// We need screen -> world
const invBase = baseTx.inverseMatrix;  // or construct the inverse
```

Alternatively, since the parent viewport is `panTrn * scale * center` (all
uniform scale + translations), we can compute world coords directly:

```ts
const sf = parentVp.scaleFactor;
const worldMouseX = (screenX - translateX - panX) * sf - centerX;
const worldMouseY = -(screenY - translateY - panY) * sf - centerY;
```

But using the inverse transform is cleaner. Check if `Transform` exposes
an `unMap` or if `Point.from(sx, sy, 0).unMap(baseTx)` works with the
transposed convention. If not, compute manually from `inverseMatrix`.

### Step 4: Update childViewport

Replace the current scale branches with:

```ts
if (sxActive && scaleFrame) {
  const hTx = scaleFrame.toTransform();
  childTx = compose(
    hTx,                                // H-local -> world
    Transform.fromScale(sx, sy, 1),     // scale in H
    hTx.inverse(),                      // world -> H-local ... need inverse
    translateTx,
    vp.transform,
  );
  if (rotActive) {
    // Rotation is already baked into H's axes, so no separate R needed
    // when scaling. But if angle changed independently (shouldn't happen
    // during scale), we'd need to update H.
  }
} else if (rotActive) {
  // rotation-only path (no scale) — keep current code
  childTx = compose(
    Transform.fromTranslation(-cx, cy, 0),
    Transform.fromRotationZ(angle),
    Transform.fromTranslation(cx, -cy, 0),
    translateTx,
    vp.transform,
  );
}
```

Note: we need the inverse of `hTx`. `Transform` stores `_inverse` already,
but there's no public `inverse()` method returning a Transform. Check if
`Frame` or `Transform` exposes this. If not, we can use:

```ts
const hInvTx = Frame.world().relative(scaleFrame).toTransform();
```

Or construct the inverse transform from the inverse matrix.

### Step 5: Remove ghost overlay and screen-space rotation

Since `childViewport` now includes both scale and rotation (baked into the
frame), the main dashed selection box IS the rotated+scaled box. No separate
ghost overlay needed for the rotated preview.

Keep the pre-scale ghost box for reference (shows original bounds before
drag started).

### Step 6: Remove un-rotation from mouse delta computation

Delete the `cosA/sinA/urDx/urDy` computation in onPointerMove. The frame
handles the coordinate conversion.

### Step 7: Update scale commit in onPointerUp

The commit sends `{ type: 'scale', sx, sy, pivotX, pivotY }` to children.
This doesn't change — children still receive world-space pivot and scale
factors. But verify that the scale factors from the frame-based approach
match what children expect.

Children apply scale as: `newWorldPos = pivot + S * (oldWorldPos - pivot)`.
The frame-based scale factors are in the LOCAL (rotated) frame. For children
that store world coordinates, we need to convert the scale to world-space.

Two options:
a) Change the commit to send a Transform (the full H * S * H^-1) and let
   children apply it directly.
b) Keep the current commit format but compute equivalent world-space pivot
   and scale factors.

Option (b) is simpler for backward compatibility. The world-space equivalent
of scaling by (sx, sy) in frame H around pivot P is:

```
worldTransform = H.direct * S(sx,sy) * H.inverse
```

Applied to a point: `newP = H.direct * S * H.inverse * oldP`.

For axis-aligned children (rectangles, ellipses), this is equivalent to
scaling by (sx, sy) around P in the rotated axes. The children's commit
handlers may need to apply this transform instead of simple axis-aligned
scale.

**Simplest approach**: since rotation is virtual (not committed to children),
the children's world data is axis-aligned. The scale in H with rotation
decomposes to:

```
R(theta) * S(sx,sy) * R(-theta)
```

around the pivot. This is NOT an axis-aligned scale — it's a rotated scale.
For the commit, we can either:

a) Send the full transform and update commit handlers.
b) Send axis-aligned scale factors by projecting the H-local scale to world.

Since the current commit format is `{sx, sy, pivotX, pivotY}` (axis-aligned),
option (a) is cleaner long-term. Add a new commit type `'transform'` that
sends a full Transform, or extend `'scale'` with an optional rotation.

### Step 8: Handle uniform scale (Shift key)

With the frame-based approach, uniform scale means `sx = sy`. Compute:

```ts
const uniform = Math.max(Math.abs(sx), Math.abs(sy));
sx = sy = uniform;
```

The pivot for uniform scale could remain the center (as currently) or switch
to the opposite corner. This is a UX choice.

### Step 9: Remove debug visuals

Remove the green cross (raw mouse), pink cross (un-rotated mouse), and any
remaining ghost overlay code. The selection box itself shows the correct
rotated+scaled state.

### Step 10: Update tests

- Update existing scale tests to work with the new frame-based approach.
- Add test: rotate 45deg, scale from corner, verify children committed
  with correct world positions.
- Add test: rotate 90deg, scale non-uniformly, verify rectangle (not
  parallelogram) in screen space.

---

## Risk / Open Questions

1. **Inverse transform access**: does `Transform` expose a clean way to get
   the inverse as a `Transform`? If only `inverseMatrix` (raw mat4) is
   available, we may need to construct a Transform from it or use
   `Frame.world().relative(H)` as a workaround.

2. **Screen-to-world conversion**: the transposed `worldToScreenPoint`
   convention means we can't simply use `Point.unMap(baseTx)` for the
   inverse. We may need to use the raw `inverseMatrix` with the same
   transposed indexing, or compute world coords from screen coords manually
   using `scaleFactor` and `pan`.

3. **Commit format**: extending the commit to send a full Transform is
   cleaner but requires updating all shape commit handlers (Ellipse,
   Rectangle, Line). Evaluate effort vs keeping axis-aligned scale.

4. **Non-uniform childViewport convention**: the transposed matrix convention
   in `worldToScreenPoint` and `buildCanvasComponent.setTransform` means the
   frame-based transform `H * S * H^-1` must produce correct results through
   BOTH the standard `vec4.transformMat4` (for children rendering) AND the
   transposed `worldToScreenPoint` (for selection box corners). Verify that
   the frame's `toTransform()` works correctly in both paths.

5. **Interaction with dragDelta**: the `translateTx` in the viewport chain
   uses `dragDelta` which is in world coordinates. After scaling in frame H,
   the drag compensation (corner-switch) may need updating. Verify that the
   existing `dragBase` compensation still works.

---

## Files to Modify

- `packages/ts-geosolid-canvas/src/select-2d.tsx` — main refactor
- `packages/ts-geosolid-canvas/src/canvas/selection.ts` — possibly extend
  `SelectionCommit` type
- `packages/ts-geosolid-canvas/src/ellipse.tsx` — commit handler (if format
  changes)
- `packages/ts-geosolid-canvas/src/rectangle.tsx` — commit handler
- `packages/ts-geosolid-canvas/src/line.tsx` — commit handler
- `packages/ts-geosolid-canvas/tests/select-2d.test.tsx` — update/add tests
