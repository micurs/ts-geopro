import { Point } from "@micurs/ts-geopro";

export type CornerQuad = [Point, Point, Point, Point];

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

/**
 * Draw the selection bounding-box outline as a closed path through its four
 * screen-space corners.
 *
 * @param ctx     - target canvas 2D context (identity transform)
 * @param corners - four screen-space corner positions in order (ccw or cw)
 */
export function drawBox(ctx: CanvasRenderingContext2D, corners: CornerQuad): void {
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.stroke();
}

export interface Handle {
  ctx: CanvasRenderingContext2D;
  position: Point;
  selected: boolean;
}

/**
 * Draw a selection handle as a filled-and-stroked circle.
 * Normal state: radius 5, white fill. Selected state: radius 7, yellow fill.
 */
export function drawHandle(handle: Handle): void {
  const r = handle.selected ? 7 : 5;
  const fill = handle.selected ? "#ffcc00" : "#ffffff";
  handle.ctx.beginPath();
  handle.ctx.arc(handle.position.x, handle.position.y, r, 0, 2 * Math.PI);
  handle.ctx.fillStyle = fill;
  handle.ctx.strokeStyle = "#333333";
  handle.ctx.lineWidth = 1.5;
  handle.ctx.fill();
  handle.ctx.stroke();
}

/**
 * Draw all selection handles.
 */
export function drawHandles(
  ctx: CanvasRenderingContext2D,
  positions: Point[],
  hoveredIndex: number,
): void {
  positions.forEach((h, i) => {
    drawHandle({ ctx, position: h, selected: i === hoveredIndex });
  });
}
