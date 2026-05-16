import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';

export interface RectangleProps {
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

export const Rectangle: Component<RectangleProps> =
  buildCanvasComponent<RectangleProps>(drawRectangle);
