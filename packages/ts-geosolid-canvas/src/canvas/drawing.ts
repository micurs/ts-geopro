/**
 * Draw a filled-pie + stroked-arc indicating a rotation angle.
 * The arc sweeps from `startAngle` by `delta` radians; the direction
 * (clockwise vs counter-clockwise) is inferred from the sign of `delta`.
 * Modifies `ctx.fillStyle`, `ctx.strokeStyle`, `ctx.globalAlpha` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param cx  - arc center X (screen pixels)
 * @param cy  - arc center Y (screen pixels)
 * @param radius - arc radius (screen pixels)
 * @param startAngle - starting angle in radians (0 = right, π/2 = down in screen coords)
 * @param delta - signed angular span in radians (positive = clockwise)
 * @param color - CSS color for both fill and stroke
 * @param fillAlpha - opacity for the filled pie (default 0.15)
 * @param strokeAlpha - opacity for the arc stroke (default 0.5)
 */
export function drawRotationArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  delta: number,
  color: string,
  fillAlpha = 0.15,
  strokeAlpha = 0.5,
): void {
  const endAngle = startAngle + delta;
  const ccw = delta < 0;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, startAngle, endAngle, ccw);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = fillAlpha;
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.globalAlpha = strokeAlpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle, ccw);
  ctx.stroke();
}

/**
 * Draw a small crosshair (plus-sign) centered at `(x, y)`.
 * Modifies `ctx.strokeStyle`, `ctx.lineWidth` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param x   - center X (screen pixels)
 * @param y   - center Y (screen pixels)
 * @param color - CSS stroke color
 * @param size - half-length of each arm in pixels (default 8)
 * @param lineWidth - stroke width (default 1.5)
 */
export function drawCenterCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = 8,
  lineWidth = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

/**
 * Draw a straight line between two points.
 * Modifies `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.globalAlpha` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param fromX - start point X (screen pixels)
 * @param fromY - start point Y (screen pixels)
 * @param toX   - end point X (screen pixels)
 * @param toY   - end point Y (screen pixels)
 * @param color - CSS stroke color
 * @param alpha - line opacity (default 0.5)
 */
export function drawPointerLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  alpha = 0.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}
