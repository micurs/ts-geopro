import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';

interface RectangleProps {
  topLeft: Point;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export const drawRectangle = (vp: Viewport, rect: RectangleProps) => {
  const { ctx, scaleFactor } = vp;
  ctx.strokeStyle = rect.color || 'black';
  ctx.lineWidth = getScaledWidth(rect.strokeWidth ?? 1, scaleFactor);

  if (rect.fill) {
    ctx.fillStyle = rect.fill;
    ctx.fillRect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
  }

  ctx.strokeRect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
};

export const Rectangle: Component<RectangleProps> = (props: RectangleProps) => {
  const ctx = useContext(canvasContext);

  createEffect(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return;
    }
    drawRectangle(vp, props);
  });

  return null;
};
