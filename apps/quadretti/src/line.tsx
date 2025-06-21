import { createEffect, onMount, useContext } from 'solid-js';
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
  const { roughCanvas, scaleFactor } = vp;
  roughCanvas.line(line.from.x, line.from.y, line.to.x, line.to.y, {
    stroke: line.color || 'black',
    strokeWidth: getScaledWidth(line.width ?? 1, scaleFactor),
    roughness: 0.05,
    seed: 10,
  });
  // const { ctx, scaleFactor, roughCanvas } = vp;
  // console.log('Drawing line', line, vp);
  // ctx.strokeStyle = line.color || 'black';
  // ctx.beginPath();
  // ctx.lineWidth = 2 * scale;
  // ctx.moveTo(line.x1, line.y1);
  // ctx.lineTo(line.x2, line.y2);
  // ctx.stroke();
};

export const Line: Component<LineProps> = (props: LineProps) => {
  const ctx = useContext(canvasContext);

  /* first draw */
  // onMount(() => {
  //   const vp = ctx?.vp();
  //   if (!vp) return;
  //   drawLine(vp, props);
  // });

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
