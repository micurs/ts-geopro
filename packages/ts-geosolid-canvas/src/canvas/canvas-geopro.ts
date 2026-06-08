import { Point, Transform, Vector } from "@micurs/ts-geopro";

/**
 * Project a world-space point to screen-space using a 2D affine transform.
 * The transform matrix elements follow the DOMMatrix convention:
 *   matrix(a, b, c, d, e, f) = [a c e; b d f; 0 0 1]
 * Y-axis is negated to convert from screen coords (Y-down) to world coords (Y-up).
 *
 * @param M - The 4x4 transform (only 2D affine components used)
 * @param p - World-space point
 * @returns Screen-space point (Y-down pixel coordinates)
 */
export function worldPointToScreen(M: Transform, p: Point): Point {
  const m = M.directMatrix;
  return Point.from(
    m[0] * p.x + m[1] * p.y + m[12],
    -m[4] * p.x - m[5] * p.y + m[13],
    0,
  );
}

/**
 * Inverse of `worldPointToScreen` — convert a screen pixel position back to
 * world coordinates under the renderer's transposed + Y-negated convention.
 *
 * @param M  Transform used to render
 * @param p  Screen-space point (pixel coordinates, Y-down).
 * @returns  World-space point, or `Point.origin()` if the transform is singular.
 */
export function screenPointToWorld(M: Transform, p: Point): Point {
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
 * Compute the mouse position relative to the canvas element as a Point.
 *
 * @param canvas - The canvas element
 * @param event  - The pointer event
 * @returns      - Canvas-space point (pixel coordinates)
 */
export function canvasPointFromEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): Point {
  const rect = canvas.getBoundingClientRect();
  return Point.from(
    event.clientX - rect.left,
    event.clientY - rect.top,
    0,
  );
}

/**
 * Convert a screen-space delta Vector to a world-space Vector using the
 * viewport scale factor. Y is negated because screen Y-down maps to world Y-up.
 *
 * @param sf  - Viewport scale factor (world units per pixel)
 * @param dv  - Screen-space delta vector (pixel coordinates, Y-down)
 * @returns   - World-space delta vector
 */
export function screenVectorToWorld(sf: number, dv: Vector): Vector {
  return Vector.from(dv.x * sf, -dv.y * sf, 0);
}

/**
 * Apply a Transform to a world point using the standard (non-transposed)
 * gl-matrix column-major convention — delegates to `Point.map()`.
 *
 * @param T  - Transform in standard gl-matrix column-major storage.
 * @param p  - World-space point to transform.
 * @returns  - Transformed point.
 */
export function applyStandardWorldTransform(T: Transform, p: Point): Point {
  return p.map(T);
}

/**
 * Derive the six `setTransform(a, b, c, d, e, f)` values from a
 * `@micurs/ts-geopro` Transform, including the Y-axis negation used by
 * the render pipeline.
 *
 * The renderer uses `setTransform` with a transposed layout:
 *   a = M[0][0], b = -M[1][0], c = M[0][1], d = -M[1][1], e = M[3][0], f = M[3][1]
 *
 * @param M  - Geo Transform (4x4, stored column-major via gl-matrix)
 * @returns  - Tuple [a, b, c, d, e, f] suitable for `ctx.setTransform(...)`
 */
export function canvasTransformFromGeoTransform(
  M: Transform,
): [number, number, number, number, number, number] {
  return [
    M.direct(0, 0),
    -M.direct(1, 0),
    M.direct(0, 1),
    -M.direct(1, 1),
    M.direct(3, 0),
    M.direct(3, 1),
  ];
}

/**
 * Apply a geo Transform as the current canvas 2D context transform.
 * This is the low-level imperative canvas call; prefers
 * `drawInWorldCoordinates` for scoped usage.
 *
 * @param ctx  - Canvas 2D rendering context
 * @param M    - Geo Transform to apply
 */
export function setCanvasWorldTransform(
  ctx: CanvasRenderingContext2D,
  M: Transform,
): void {
  ctx.setTransform(...canvasTransformFromGeoTransform(M));
}

/**
 * Reset the canvas context to the identity transform (screen coordinates).
 *
 * @param ctx  - Canvas 2D rendering context
 */
export function resetCanvasTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Draw in world-coordinate space: save the current context, apply the geo
 * Transform, execute the draw callback, then restore. Ensures
 * save/restore discipline even if the callback throws.
 *
 * @param ctx       - Canvas 2D rendering context
 * @param transform - Geo Transform to apply
 * @param draw      - Drawing function called with the world transform active
 */
export function drawInWorldCoordinates(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  draw: () => void,
): void {
  ctx.save();
  try {
    setCanvasWorldTransform(ctx, transform);
    draw();
  } finally {
    ctx.restore();
  }
}

/**
 * Draw in screen-coordinate space: save the current context, reset to
 * identity, execute the draw callback, then restore. Ensures
 * save/restore discipline even if the callback throws.
 *
 * @param ctx   - Canvas 2D rendering context
 * @param draw  - Drawing function called with identity transform
 */
export function drawInScreenCoordinates(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
): void {
  ctx.save();
  try {
    resetCanvasTransform(ctx);
    draw();
  } finally {
    ctx.restore();
  }
}
