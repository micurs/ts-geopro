## 1. Ticket and Git Branch Name

- Ticket: #69, http://gitea.micurs.com:3000/micurs/ts-geopro/issues/69
- Branch: micurs/69-select2d-rotation-snapping
- Remote: origin-gitea

## 2. Rationale

Add this in `@micurs/ts-geosolid-canvas`, centered on
`packages/ts-geosolid-canvas/src/select-2d.tsx`. `Select2D` already owns the
rotation drag state, angle preview, and rotation arc drawing, so snapping should
live beside that pointer-move logic rather than in the core geometry package.

The safest shape is to add an opt-in prop, likely `snapRotation?: boolean`, with
a small internal threshold around the nearest 90-degree increment. While the
cursor is within the snap threshold, store the snapped angle in
`rotationAngle()` and draw the rotation arc in orange. When outside the
threshold, preserve the current free-rotation behavior and existing selection
color.

## 3. Steps

1. Extend `Select2DProps` in
   `packages/ts-geosolid-canvas/src/select-2d.tsx` with an optional rotation
   snapping attribute, defaulting to disabled to avoid changing existing
   behavior.
2. Add a small helper for quadrant snapping: normalize the candidate angle, find
   the nearest multiple of `Math.PI / 2`, and return both the effective angle
   and whether snapping is active.
3. Update the rotation pointer-move path so the candidate
   `rotationBase + curAngle - rotInitAngle()` is passed through the snapping
   helper when the prop is enabled.
4. Track whether the current rotation preview is snapped, probably with a Solid
   signal, and reset it when rotation starts and ends.
5. Change the rotation preview drawing so `drawPointerLine()` and
   `drawRotationArc()` use orange while snapped, and the existing selection
   color otherwise.
6. Update package docs or examples if `Select2D` props are documented in
   `packages/ts-geosolid-canvas/README.md`.
7. Keep the core `@micurs/ts-geopro` package untouched unless implementation
   discovery reveals shared math that truly belongs there.

## 4. Version Changes

MINOR for `@micurs/ts-geosolid-canvas` if this package's version is being
maintained for releases, because this adds backward-compatible component
functionality through a new optional prop. No version change is needed for
`@micurs/ts-geopro`.

## 5. Tests

Planned tests:

1. Add `Select2D` tests showing rotation remains unsnapped by default.
2. Add a `Select2D` test with snapping enabled where a drag near 0, 90, 180, or
   270 degrees sets the snapped rotation angle.
3. Add a test where dragging outside the snap threshold preserves free rotation
   and does not use the snapped color.
4. Add a canvas drawing assertion that the rotation arc or pointer line receives
   orange while snapped.
5. Run `pnpm --filter @micurs/ts-geosolid-canvas test`, then the repo-standard
   `pnpm lint`, `pnpm build`, and `pnpm test` before PR.
