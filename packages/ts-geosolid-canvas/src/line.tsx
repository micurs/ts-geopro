import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import { Point, Vector, UnitVector, Frame } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';

/**
 * Properties for the Line component
 */
interface LineProps {
  /** Starting point of the line */
  from: Point;
  /** Ending point of the line */
  to: Point;
  /** Line color (default: 'black') */
  color?: string;
  /** Line width in logical units (default: 1) */
  width?: number;
  /** End cap at the start of the line ('arrow', 'circle', or 'none', default: 'none') */
  start?: 'none' | 'arrow' | 'circle';
  /** End cap at the end of the line ('arrow', 'circle', or 'none', default: 'none') */
  end?: 'none' | 'arrow' | 'circle';
  /** Size of the start end cap in logical units (default: 5) */
  startSize?: number;
  /** Size of the end end cap in logical units (default: 5) */
  endSize?: number;
  /** Style of the start end cap ('filled' or 'empty', default: 'empty') */
  startStyle?: 'filled' | 'empty';
  /** Style of the end end cap ('filled' or 'empty', default: 'empty') */
  endStyle?: 'filled' | 'empty';
  /** Color for the start end cap (default: inherits line color) */
  startColor?: string;
  /** Color for the end end cap (default: inherits line color) */
  endColor?: string;
}

/**
 * Draw an arrowhead at a specified point
 * @param vp - The viewport context containing canvas and scale information
 * @param point - The point where the arrow tip should be positioned
 * @param direction - Unit vector indicating the direction the arrow points
 * @param size - Size of the arrow in logical units
 * @param color - Color to render the arrow
 * @param filled - Whether to fill the arrow (true) or stroke it (false)
 */
const drawArrowHead = (
  vp: Viewport,
  point: Point,
  direction: UnitVector,
  size: number,
  color: string,
  filled: boolean
) => {
  const { ctx, scaleFactor } = vp;
  const vOut = Vector.from(0, 0, 1);

  // Use the direction to create the frame (k-axis will be the arrow direction)
  const fr = Frame.from2Vectors(point, direction, vOut);

  // Scale factor for arrow size
  const arrowScale = size * scaleFactor;

  const wingXP = Vector.from(fr.j).scale(arrowScale);
  const wingXM = Vector.from(fr.j).scale(-arrowScale);
  const wingZ = Vector.from(fr.k).scale(-arrowScale * 2);

  const endPoint = point.add(Vector.from(direction).scale(arrowScale));
  const wingStart = endPoint.add(wingZ);
  const wingLeft = wingStart.add(wingXP);
  const wingRight = wingStart.add(wingXM);

  ctx.beginPath();
  ctx.moveTo(wingStart.x, wingStart.y);
  ctx.lineTo(wingLeft.x, wingLeft.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.lineTo(wingRight.x, wingRight.y);
  ctx.lineTo(wingStart.x, wingStart.y);

  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

/**
 * Draw a circle at a specified point
 * @param vp - The viewport context containing canvas and scale information
 * @param point - The point where the circle center should be positioned
 * @param size - Radius of the circle in logical units
 * @param color - Color to render the circle
 * @param filled - Whether to fill the circle (true) or stroke it (false)
 */
const drawCircle = (
  vp: Viewport,
  point: Point,
  size: number,
  color: string,
  filled: boolean
) => {
  const { ctx, scaleFactor } = vp;
  const radius = size * scaleFactor;

  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);

  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

/**
 * Draw a line with optional end caps (arrows or circles) on a canvas viewport
 * @param vp - The viewport context containing canvas and transformation info
 * @param line - The line properties including endpoints, color, and end cap options
 */
export const drawLine = (vp: Viewport, line: LineProps) => {
  const { ctx, scaleFactor } = vp;
  const lineColor = line.color || 'black';

  // Draw the line
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = getScaledWidth(line.width ?? 1, scaleFactor);
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.stroke();

  // Draw start end cap if specified
  switch (line.start) {
    case 'arrow': {
      const direction = UnitVector.from(Vector.fromPoints(line.from, line.to));
      const startSize = line.startSize ?? 5;
      const startColor = line.startColor || lineColor;
      const startFilled = line.startStyle === 'filled';
      drawArrowHead(vp, line.from, direction, startSize, startColor, startFilled);
      break;
    }
    case 'circle': {
      const startSize = line.startSize ?? 5;
      const startColor = line.startColor || lineColor;
      const startFilled = line.startStyle === 'filled';
      drawCircle(vp, line.from, startSize, startColor, startFilled);
      break;
    }
  }

  // Draw end end cap if specified
  switch (line.end) {
    case 'arrow': {
      const direction = UnitVector.from(Vector.fromPoints(line.to, line.from));
      const endSize = line.endSize ?? 5;
      const endColor = line.endColor || lineColor;
      const endFilled = line.endStyle === 'filled';
      drawArrowHead(vp, line.to, direction, endSize, endColor, endFilled);
      break;
    }
    case 'circle': {
      const endSize = line.endSize ?? 5;
      const endColor = line.endColor || lineColor;
      const endFilled = line.endStyle === 'filled';
      drawCircle(vp, line.to, endSize, endColor, endFilled);
      break;
    }
  }
};

/**
 * Solid.JS component that renders a line on the canvas with optional arrows
 *
 * @example
 * ```tsx
 * <Line
 *   from={Point.from(0, 0, 0)}
 *   to={Point.from(100, 100, 0)}
 *   color="#ff0000"
 *   end="arrow"
 *   endStyle="filled"
 * />
 * ```
 */
export const Line: Component<LineProps> = (props: LineProps) => {
  const ctx = useContext(canvasContext);

  /* redraw reactively if props change */
  createEffect(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return;
    }
    drawLine(vp, props);
  });

  return null;
};
