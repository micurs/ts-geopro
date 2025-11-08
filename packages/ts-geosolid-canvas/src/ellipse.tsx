import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';

interface EllipseProps {
  center: Point;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export const drawEllipse = (vp: Viewport, ellipse: EllipseProps) => {
  const { ctx, scaleFactor } = vp;
  ctx.strokeStyle = ellipse.color || 'black';
  ctx.lineWidth = getScaledWidth(ellipse.strokeWidth ?? 1, scaleFactor);

  ctx.beginPath();
  ctx.ellipse(
    ellipse.center.x,
    ellipse.center.y,
    ellipse.width / 2,
    ellipse.height / 2,
    0,
    0,
    2 * Math.PI
  );

  if (ellipse.fill) {
    ctx.fillStyle = ellipse.fill;
    ctx.fill();
  }
  ctx.stroke();
};

export const Ellipse: Component<EllipseProps> = (props: EllipseProps) => {
  const ctx = useContext(canvasContext);

  createEffect(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return;
    }
    drawEllipse(vp, props);
  });

  return null;
};
