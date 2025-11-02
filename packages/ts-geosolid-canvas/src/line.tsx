import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';

interface LineProps {
  from: Point;
  to: Point;
  color?: string;
  width?: number;
}

export const drawLine = (vp: Viewport, line: LineProps) => {
  const { ctx, scaleFactor } = vp;
  ctx.strokeStyle = line.color || 'black';
  ctx.lineWidth = getScaledWidth(line.width ?? 1, scaleFactor);
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.stroke();
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
