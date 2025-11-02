import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point } from '@micurs/ts-geopro';
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
  const { roughCanvas, scaleFactor } = vp;
  roughCanvas.ellipse(ellipse.center.x, ellipse.center.y, ellipse.width, ellipse.height, {
    stroke: ellipse.color || 'black',
    strokeWidth: getScaledWidth(ellipse.strokeWidth ?? 1, scaleFactor),
    fill: ellipse.fill,
    roughness: 0.1,
    seed: 10,
    fillStyle: 'cross-hatch',
    fillWeight: 0.1 * getScaledWidth(ellipse.strokeWidth ?? 1, scaleFactor),
    hachureGap: 2,
    preserveVertices: true,
  });
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
