import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';
import { useShapeBoundsRegistration } from './canvas/selection.ts';
import type { DrawableProps } from './types.ts';

export interface RectangleProps extends DrawableProps {
  center: Point;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * Draw a rectangle on the canvas viewport
 * @param vp - The viewport context with canvas and scale information
 * @param rect - Rectangle properties (center, dimensions, style)
 */
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

const RectangleBase = buildCanvasComponent<RectangleProps>(drawRectangle);

/**
 * SolidJS component that renders a rectangle on the canvas
 *
 * @example
 * ```tsx
 * <Rectangle
 *   id="my-rect"
 *   center={Point.from(50, 50, 0)}
 *   width={100}
 *   height={80}
 *   color="#2266ff"
 *   strokeWidth={2}
 * />
 * ```
 */
export const Rectangle: Component<RectangleProps> = (props) => {
  useShapeBoundsRegistration(props.id, () => ({
    minX: props.center.x - props.width / 2,
    minY: props.center.y - props.height / 2,
    maxX: props.center.x + props.width / 2,
    maxY: props.center.y + props.height / 2,
  }));
  return RectangleBase(props);
};
