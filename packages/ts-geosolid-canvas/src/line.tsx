import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import { Point, Vector, UnitVector, Frame } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';

interface LineProps {
  from: Point;
  to: Point;
  color?: string;
  width?: number;
  startArrow?: 'none' | 'arrow';
  endArrow?: 'none' | 'arrow';
  arrowSize?: number;
  arrowFilled?: boolean;
  arrowColor?: string;
}

const drawArrowHead = (vp: Viewport, point: Point, direction: UnitVector, size: number, color: string, filled: boolean) => {
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

export const drawLine = (vp: Viewport, line: LineProps) => {
  const { ctx, scaleFactor } = vp;
  const lineColor = line.color || 'black';
  const arrowColor = line.arrowColor || lineColor;
  const arrowSize = line.arrowSize ?? 5;
  const arrowFilled = line.arrowFilled ?? false;

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = getScaledWidth(line.width ?? 1, scaleFactor);
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.stroke();

  // Draw start arrow if specified
  if (line.startArrow === 'arrow') {
    const direction = UnitVector.from(Vector.fromPoints(line.from, line.to));
    drawArrowHead(vp, line.from, direction, arrowSize, arrowColor, arrowFilled);
  }

  // Draw end arrow if specified
  if (line.endArrow === 'arrow') {
    const direction = UnitVector.from(Vector.fromPoints(line.to, line.from));
    drawArrowHead(vp, line.to, direction, arrowSize, arrowColor, arrowFilled);
  }
};

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
