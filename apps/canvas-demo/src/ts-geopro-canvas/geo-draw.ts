import { Frame, Point, UnitVector, Vector } from '@micurs/ts-geopro';

import type { Viewport } from './types.ts';

export const drawPoint = (vp: Viewport) => (f: Point) => {
  const { ctx, scaleFactor } = vp;
  const w = Math.max(6.0e-7, 4 * scaleFactor);
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, w, w, 0, 0, 2 * Math.PI);
  ctx.fill();
};

export const drawVector = (vp: Viewport) => (start: Point, v: Vector | UnitVector) => {
  const { ctx } = vp;
  const end = start.add(v);
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
};

export const drawFrame = (vp: Viewport) => (f: Frame) => {
  const { ctx } = vp;
  const drawAxes = drawVector(vp);
  ctx.lineWidth = 4 * vp.scaleFactor;
  ctx.strokeStyle = 'red';
  drawAxes(f.o, f.i);
  ctx.lineWidth = 4 * vp.scaleFactor;
  ctx.strokeStyle = 'green';
  drawAxes(f.o, f.j);
  ctx.fillStyle = 'yellow';
  drawPoint(vp)(f.o);
};
