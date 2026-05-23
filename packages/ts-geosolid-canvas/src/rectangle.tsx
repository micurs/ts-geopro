import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';

export interface RectangleProps {
  center: Point;
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

  const tlX = rect.center.x - rect.width / 2;
  const tlY = rect.center.y - rect.height / 2;

  if (rect.fill) {
    ctx.fillStyle = rect.fill;
    ctx.fillRect(tlX, tlY, rect.width, rect.height);
  }

  ctx.strokeRect(tlX, tlY, rect.width, rect.height);
};

export const Rectangle: Component<RectangleProps> =
  buildCanvasComponent<RectangleProps>(drawRectangle);
