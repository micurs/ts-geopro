import { Frame, Point, Ray, UnitVector, Vector } from '@micurs/ts-geopro';

import type { Viewport } from './types.ts';

export const drawPoint = (vp: Viewport) => (f: Point) => {
  const { ctx, scaleFactor } = vp;
  const scale = Math.min(0.01, scaleFactor);

  const w = scale * 4;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, w, w, 0, 0, 2 * Math.PI);
  ctx.fill();
};

const drawArrowHead = (vp: Viewport, start: Point, v: Vector | UnitVector) => {
  const { ctx, scaleFactor } = vp;
  const arrowSize = 5;
  const scale = Math.min(0.01, scaleFactor);
  const vOut = Vector.from(0, 0, 1);
  const fr = Frame.from2Vectors(start, v, vOut);
  const wingXP = Vector.from(fr.j).scale(arrowSize * scale);
  const wingXM = Vector.from(fr.j).scale(-arrowSize * scale);
  const wingZ = Vector.from(fr.k).scale(-arrowSize * scale * 2);

  const endPoint = start.add(v);
  const wingStart = endPoint.add(wingZ);
  const wingLeft = wingStart.add(wingXP);
  const wingRight = wingStart.add(wingXM);
  ctx.beginPath();
  // Draw the arrow head
  ctx.moveTo(wingStart.x, wingStart.y);
  ctx.lineTo(wingLeft.x, wingLeft.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.lineTo(wingRight.x, wingRight.y);
  ctx.lineTo(wingStart.x, wingStart.y);
  ctx.stroke();
};

export const drawVector = (vp: Viewport) => (start: Point, v: Vector | UnitVector) => {
  const { ctx, scaleFactor } = vp;
  const endPoint = start.add(v);
  const scale = Math.min(0.01, scaleFactor);

  ctx.beginPath();
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.stroke();
  // Draw the arrow head
  drawArrowHead(vp, start, v);
};

export const drawFrame = (vp: Viewport) => (f: Frame) => {
  const { ctx } = vp;

  const drawAxes = drawVector(vp);
  ctx.strokeStyle = 'red';
  drawAxes(f.o, f.i);
  ctx.strokeStyle = 'green';
  drawAxes(f.o, f.j);
  ctx.fillStyle = 'yellow';
  drawPoint(vp)(f.o);
};

export const drawRay = (vp: Viewport) => (r: Ray) => {
  const { ctx } = vp;

  ctx.strokeStyle = 'grey';
  drawVector(vp)(r.o, r.d);
  drawPoint(vp)(r.o);
};
