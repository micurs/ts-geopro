import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point } from '@micurs/ts-geopro';
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
  const { roughCanvas, scaleFactor } = vp;
  roughCanvas.rectangle(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height, {
    stroke: rect.color || 'black',
    strokeWidth: getScaledWidth(rect.strokeWidth ?? 1, scaleFactor),
    fill: rect.fill,
    roughness: 0.2,
    bowing: 10,
    seed: 10,
    fillStyle: 'cross-hatch',
    fillWeight: 0.5 * getScaledWidth(rect.strokeWidth ?? 1, scaleFactor),
    preserveVertices: true,
    hachureGap: 4,
  });
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
