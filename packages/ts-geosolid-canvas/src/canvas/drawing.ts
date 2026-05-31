import { Point } from "@micurs/ts-geopro";

/**
 * Draw a filled-pie + stroked-arc indicating a rotation angle.
 * The arc sweeps from `startAngle` by `delta` radians; the direction
 * (clockwise vs counter-clockwise) is inferred from the sign of `delta`.
 * Modifies `ctx.fillStyle`, `ctx.strokeStyle`, `ctx.globalAlpha` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param center - arc center (screen pixels)
 * @param radius - arc radius (screen pixels)
 * @param startAngle - starting angle in radians (0 = right, π/2 = down in screen coords)
 * @param delta - signed angular span in radians (positive = clockwise)
 * @param color - CSS color for both fill and stroke
 * @param fillAlpha - opacity for the filled pie (default 0.15)
 * @param strokeAlpha - opacity for the arc stroke (default 0.5)
 */
export function drawRotationArc(
  ctx: CanvasRenderingContext2D,
  center: Point,
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
  ctx.moveTo(center.x, center.y);
  ctx.arc(center.x, center.y, radius, startAngle, endAngle, ccw);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = fillAlpha;
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.globalAlpha = strokeAlpha;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, startAngle, endAngle, ccw);
  ctx.stroke();
}

/**
 * Draw a small crosshair (plus-sign) centered at a screen point.
 * Modifies `ctx.strokeStyle`, `ctx.lineWidth` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param center - crosshair center (screen pixels)
 * @param color - CSS stroke color
 * @param size - half-length of each arm in pixels (default 8)
 * @param lineWidth - stroke width (default 1.5)
 */
export function drawCenterCrosshair(
  ctx: CanvasRenderingContext2D,
  center: Point,
  color: string,
  size = 8,
  lineWidth = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(center.x - size, center.y);
  ctx.lineTo(center.x + size, center.y);
  ctx.moveTo(center.x, center.y - size);
  ctx.lineTo(center.x, center.y + size);
  ctx.stroke();
}

/**
 * Draw a straight line between two screen points.
 * Modifies `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.globalAlpha` on exit.
 *
 * @param ctx - target canvas 2D context
 * @param from - start point (screen pixels)
 * @param to   - end point (screen pixels)
 * @param color - CSS stroke color
 * @param alpha - line opacity (default 0.5)
 */
export function drawPointerLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  alpha = 0.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}
