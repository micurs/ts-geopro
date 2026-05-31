import { add, compose, Point, Transform, Vector } from "@micurs/ts-geopro";
import type { BoundingBox } from "../types.ts";

/**
 * Project a world-space point to screen-space using a 2D affine transform.
 * The transform matrix elements follow the DOMMatrix convention:
 *   matrix(a, b, c, d, e, f) = [a c e; b d f; 0 0 1]
 * Y-axis is negated to convert from screen coords (Y-down) to world coords (Y-up).
 *
 * NOTE: this function does NOT use Point.map() because the renderer reads the
 * matrix transposed (via the direct(row,col) accessor) with Y negated, while
 * Point.map uses the standard gl-matrix column-major convention. The manual
 * element access here matches what setTransform actually produces on canvas.
 *
 * @param M - The 4x4 transform (only 2D affine components used)
 * @param p - World-space point
 * @returns Screen-space point (Y-down pixel coordinates)
 */
export function worldToScreenPoint(M: Transform, p: Point): Point {
  const m = M.directMatrix;
  return Point.from(
    m[0] * p.x + m[1] * p.y + m[12],
    -m[4] * p.x - m[5] * p.y + m[13],
    0,
  );
}

/**
 * Inverse of `worldToScreenPoint` — convert a screen pixel position back to
 * world coordinates under the renderer's transposed + Y-negated convention.
 *
 * Solves for (wx, wy) such that `worldToScreenPoint(M, (wx,wy)) = (sx, sy)`
 * by inverting the 2×2 linear part: `det = a·d − b·c`.
 *
 * @param M  Transform used to render (must match the matrix passed to
 *           `worldToScreenPoint` / `setTransform`).
 * @param p  Screen-space point (pixel coordinates, Y-down).
 * @returns  World-space point, or `Point.origin()` if the transform is singular.
 */
export function screenToWorldPoint(M: Transform, p: Point): Point {
  const m = M.directMatrix;
  const a = m[0], b = m[1], tx = m[12];
  const c = m[4], d = m[5], ty = m[13];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) {
    return Point.origin();
  }
  const invDet = 1 / det;
  const u = p.x - tx;
  const v = -(p.y - ty);
  return Point.from(
    (d * u - b * v) * invDet,
    (-c * u + a * v) * invDet,
    0,
  );
}

/**
 * Rotation by `angle` around the world point `pivot`, as a Transform that is
 * correct under the renderer's transposed + Y-negated convention
 * (`worldToScreenPoint` / `setTransform`).
 *
 * A naive `T(px,py) · Rz · T(-px,-py)` rotates around (px,py) only in a
 * standard (Y-up, non-transposed) pipeline. Because the renderer negates the
 * Y axis, the pivot's Y must be flipped in the conjugating translations so
 * that `pivot` is a true fixed point of the rendered rotation. Without this,
 * the rendered rotation pivots around a point reflected in Y — e.g. a box
 * appears to rotate about a point one box-height above its center.
 *
 * @param angle  Rotation angle in radians (positive = counter-clockwise in
 *               screen space, which is clockwise in world Y-up space).
 * @param pivot  World-space point the rotation is anchored at. Stays fixed
 *               on screen under the transposed + Y-negated renderer.
 * @returns      A Transform that applies `T(pivot) · Rz(angle) · T(-pivot)`
 *               with the Y-flip described above.
 */
export function rotationAround(angle: number, pivot: Point): Transform {
  return compose(
    Transform.fromTranslation(-pivot.x, pivot.y, 0),
    Transform.fromRotationZ(angle),
    Transform.fromTranslation(pivot.x, -pivot.y, 0),
  );
}

/**
 * Apply a Transform to a world point using the standard (non-transposed)
 * gl-matrix column-major convention — delegates to `Point.map()`.
 *
 * Unlike `worldToScreenPoint` this does NOT transpose the linear part nor
 * negate Y; it is a straight `M·p` column-vector multiply. This is the
 * correct convention for world-space computation (e.g. locating a rotated
 * pivot in the parent frame) and should NOT be used for screen projection.
 *
 * @param T  Transform in standard gl-matrix column-major storage.
 * @param p  World-space point to transform.
 * @returns  Transformed point.
 */
export function applyWorldStandard(T: Transform, p: Point): Point {
  return p.map(T);
}

/**
 * Project the pivot corner to screen space exactly as the committed shapes
 * will render it, given a trial world translate `dv`.
 *
 * The commit pipeline is:
 * 1. Scale every unpadded box corner around `pivot` by `(sx, sy)`.
 * 2. Translate every resulting corner by `dv` (the compensation being
 *    solved for).
 * 3. Compute the bounding-box center of the translated, scaled corners.
 * 4. Rotate around that center (the selection rotation) via `rotationAround`.
 * 5. Project to screen via `worldToScreenPoint(baseTx)`.
 *
 * The result is affine in `dv`, which is why the 2-point numeric solve in
 * `scaleCommitTranslation` works exactly.
 *
 * @param baseTx  World→screen transform (translateTx · vp.transform).
 * @param angle   Selection rotation angle in radians.
 * @param box     Axis-aligned (unpadded) selection bounds at drag start.
 * @param pivot   Scale pivot corner (world coordinates, un-rotated space).
 * @param sx      X scale factor.
 * @param sy      Y scale factor.
 * @param dv      Trial world translation vector to evaluate.
 * @returns       Screen-space point of the pivot corner under the commit
 *                pipeline with the given translate.
 */
function committedPivotScreen(
  baseTx: Transform,
  angle: number,
  box: BoundingBox,
  pivot: Point,
  sx: number,
  sy: number,
  dv: Vector,
): Point {
  const corners: Point[] = [
    box.min,
    Point.from(box.max.x, box.min.y, 0),
    box.max,
    Point.from(box.min.x, box.max.y, 0),
  ];
  const scaleVec = Vector.from(sx, sy, 0);
  const final = corners.map((c) =>
    add(pivot, Vector.fromPoints(c, pivot).multiply(scaleVec), dv)
  );
  const xs = final.map((c) => c.x);
  const ys = final.map((c) => c.y);
  const center = Point.from(
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    0,
  );
  const pivScaled = pivot.add(dv);
  return worldToScreenPoint(
    compose(rotationAround(angle, center), baseTx),
    pivScaled,
  );
}

/**
 * Compute the world-space translate `(dx, dy)` to apply to children after a
 * rotated scale commit so the selection box stays exactly where the drag
 * preview placed it — eliminating the release jump.
 *
 * ## Why this is needed
 *
 * During the drag the scale preview rotates around the ORIGINAL box center
 * (see `buildScaleChildTransform`). On commit the shapes scale around the
 * pivot AND the selection rotation re-applies around the NEW bounding-box
 * center. These two transformations shift the padded outline corner in
 * opposite directions, coupled through the translation compensation itself.
 *
 * ## Solution: 2-point numeric solve
 *
 * We evaluate `committedPivotScreen` at three trial translates:
 *   `δ₀ = (0, 0)`, `δ₁ = (1, 0)`, `δ₂ = (0, 1)`.
 *
 * Because the pipeline is affine in δ, the resulting screen positions give
 * the Jacobian `J` (2×2) of the mapping `δ → screenPivot`. We then solve
 * `J · δ = screenDragPivot − screenPivot(0)` for δ, which is a simple
 * 2×2 linear system. The solution is exact up to floating-point precision.
 *
 * `committedPivotScreen` tracks the *padded* outline corner (not just the
 * pivot world point), so the solve automatically handles the padding offset
 * between the drag-time visual corner and the post-commit corner.
 *
 * @param baseTx  World→screen transform excluding the selection rotation
 *                (i.e. `translateTx · vp.transform`), same as used for the
 *                drag preview.
 * @param angle   Selection rotation angle in radians.
 * @param center  Box center at drag start (rotation around this point during
 *                the drag preview).
 * @param box     Axis-aligned padded selection bounds at drag start.
 * @param pivot   Scale pivot corner (world coordinates, un-rotated space).
 * @param sx      X scale factor applied during the drag.
 * @param sy      Y scale factor applied during the drag.
 * @returns       World translate to apply as a `translate` commit
 *                after the `scale` commit, or zero vector if the system is
 *                singular (should not happen for valid transforms).
 */
export function scaleCommitTranslation(
  baseTx: Transform,
  angle: number,
  center: Point,
  box: BoundingBox,
  pivot: Point,
  sx: number,
  sy: number,
): Vector {
  // Where the drag pinned the pivot (rotation around the original center).
  const dragPivot = worldToScreenPoint(
    compose(rotationAround(angle, center), baseTx),
    pivot,
  );
  // committedPivot(δ) is affine in δ: sample at 0 and the two unit basis
  // translates to recover the Jacobian, then solve committedPivot(δ) = dragPivot.
  const r0 = committedPivotScreen(
    baseTx, angle, box, pivot, sx, sy,
    Vector.from(0, 0, 0),
  );
  const rx = committedPivotScreen(
    baseTx, angle, box, pivot, sx, sy,
    Vector.from(1, 0, 0),
  );
  const ry = committedPivotScreen(
    baseTx, angle, box, pivot, sx, sy,
    Vector.from(0, 1, 0),
  );
  // Jacobian columns: δ=(1,0) and δ=(0,1) screen deltas (raw numbers).
  const Jxx = rx.x - r0.x, Jyx = rx.y - r0.y;
  const Jxy = ry.x - r0.x, Jyy = ry.y - r0.y;
  // Screen-space offset from zero-translate pivot to drag pivot.
  const bx = dragPivot.x - r0.x;
  const by = dragPivot.y - r0.y;
  const det = Jxx * Jyy - Jxy * Jyx;
  if (Math.abs(det) < 1e-12) {
    return Vector.from(0, 0, 0);
  }
  const dux = (bx * Jyy - Jxy * by) / det;
  const duy = (Jxx * by - bx * Jyx) / det;
  return Vector.from(dux, duy, 0);
}

/**
 * Check whether a screen-space point lies inside a convex polygon.
 *
 * For a degenerate polygon (0–2 corners) any point is considered inside,
 * since there is no enclosing region to be outside of.
 * Uses the cross-product sign test: all cross products from consecutive
 * edges to the point must have the same sign for a point to be inside.
 *
 * @param p       - screen-space point to test
 * @param corners - polygon vertices in order (screen pixel coords)
 * @returns true if p is inside the convex polygon
 */
export function pointInConvexPolygon(
  p: Point,
  corners: Point[],
): boolean {
  let pos = false;
  let neg = false;
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    const a = corners[i]!;
    const b = corners[j]!;
    const cross = Vector.fromPoints(a, b).crossProduct(Vector.fromPoints(a, p)).z;
    if (cross > 0) pos = true;
    if (cross < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}
