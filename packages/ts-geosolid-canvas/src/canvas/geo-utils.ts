// geo-utils.ts — compatibility re-export module
// All canvas/geopro conversion utilities now live in canvas-geopro.ts.
// This file re-exports them under both new and old names for backward compat
// during the migration. New code should import from canvas-geopro.ts directly.

import { add, compose, Point, Transform, Vector } from "@micurs/ts-geopro";
import type { BoundingBox, InteractiveScaling } from "../types.ts";

export {
  applyStandardWorldTransform,
  canvasPointFromEvent,
  canvasTransformFromGeoTransform,
  drawInScreenCoordinates,
  drawInWorldCoordinates,
  resetCanvasTransform,
  screenPointToWorld,
  screenVectorToWorld,
  setCanvasWorldTransform,
  worldPointToScreen,
} from "./canvas-geopro.ts";

import {
  applyStandardWorldTransform,
  canvasPointFromEvent,
  screenPointToWorld,
  screenVectorToWorld,
  worldPointToScreen,
} from "./canvas-geopro.ts";

/**
 * @deprecated Use `worldPointToScreen(transform, point)` instead.
 */
export function worldToScreenPoint(M: Transform, p: Point): Point {
  return worldPointToScreen(M, p);
}

/**
 * @deprecated Use `screenPointToWorld(transform, point)` instead.
 */
export function screenToWorldPoint(M: Transform, p: Point): Point {
  return screenPointToWorld(M, p);
}

/**
 * @deprecated Use `screenVectorToWorld(scaleFactor, vector)` instead.
 */
export function screenDeltaToWorld(sf: number, dv: Vector): Vector {
  return screenVectorToWorld(sf, dv);
}

/**
 * @deprecated Use `canvasPointFromEvent(canvas, event)` instead.
 */
export function screenPoint(e: PointerEvent, canvas: HTMLCanvasElement): Point {
  return canvasPointFromEvent(canvas, e);
}

/**
 * @deprecated Use `applyStandardWorldTransform(transform, point)` instead.
 */
export function applyWorldStandard(T: Transform, p: Point): Point {
  return applyStandardWorldTransform(T, p);
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
 * Project the pivot corner to screen space exactly as the committed shapes
 * will render it, given a trial world translate `dv`.
 *
 * The commit pipeline is:
 * 1. Scale every unpadded box corner around `pivot` by `(sx, sy)`.
 * 2. Translate every resulting corner by `dv` (the compensation being
 *    solved for).
 * 3. Compute the bounding-box center of the translated, scaled corners.
 * 4. Rotate around that center (the selection rotation) via `rotationAround`.
 * 5. Project to screen via `worldPointToScreen(baseTx)`.
 *
 * The result is affine in `dv`, which is why the 2-point numeric solve in
 * `scaleCommitTranslation` works exactly.
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
  return worldPointToScreen(
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
 * @param scaling The active scaling state (carries center, box, pivot).
 * @param sx      X scale factor applied during the drag.
 * @param sy      Y scale factor applied during the drag.
 * @returns       World translate to apply as a `translate` commit
 *                after the `scale` commit, or zero vector if the system is
 *                singular (should not happen for valid transforms).
 */
export function scaleCommitTranslation(
  baseTx: Transform,
  angle: number,
  scaling: InteractiveScaling,
  sx: number,
  sy: number,
): Vector {
  if (!scaling.active) {
    return Vector.from(0, 0, 0);
  }
  const { center, box, shiftActive, centerPivot, pivot: rawPivot } = scaling;
  const pivot = shiftActive ? centerPivot : rawPivot;
  const dragPivot = worldPointToScreen(
    compose(rotationAround(angle, center), baseTx),
    pivot,
  );
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
  const Jxx = rx.x - r0.x, Jyx = rx.y - r0.y;
  const Jxy = ry.x - r0.x, Jyy = ry.y - r0.y;
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
    if (cross > 0) {
      pos = true;
    }
    if (cross < 0) {
      neg = true;
    }
    if (pos && neg) {
      return false;
    }
  }
  return true;
}

/**
 * Test a screen-space point against handle positions. Returns the index of
 * the first handle within `hitRadius` pixels, or -1 if none.
 */
export function hitTestHandle(
  positions: Point[],
  sp: Point,
  hitRadius = 7,
): number {
  const rSq = hitRadius * hitRadius;
  return positions.findIndex((h) => {
    const dx = sp.x - h.x;
    const dy = sp.y - h.y;
    return dx * dx + dy * dy < rSq;
  });
}

/**
 * Register three pointer-event listeners on a canvas with `{ capture: true }`.
 * Call the returned function to remove them.
 */
export function captureMouseEvents(
  canvas: HTMLCanvasElement,
  onPointerDown: (e: PointerEvent) => void,
  onPointerMove: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void,
): () => void {
  canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
  canvas.addEventListener("pointermove", onPointerMove, { capture: true });
  canvas.addEventListener("pointerup", onPointerUp, { capture: true });
  return () => releaseMouseEvents(canvas, onPointerDown, onPointerMove, onPointerUp);
}

/**
 * Remove three pointer-event listeners previously added via `captureMouseEvents`.
 */
export function releaseMouseEvents(
  canvas: HTMLCanvasElement,
  onPointerDown: (e: PointerEvent) => void,
  onPointerMove: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void,
): void {
  canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
  canvas.removeEventListener("pointermove", onPointerMove, { capture: true });
  canvas.removeEventListener("pointerup", onPointerUp, { capture: true });
}
