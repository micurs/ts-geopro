import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import type { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';
import { useShapeBoundsRegistration } from './canvas/selection.ts';
import type { DrawableProps } from './types.ts';

export interface EllipseProps extends DrawableProps {
  center: Point;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * Draw an ellipse on the canvas viewport
 * @param vp - The viewport context with canvas and scale information
 * @param ellipse - Ellipse properties (center, dimensions, style)
 */
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

const EllipseBase = buildCanvasComponent<EllipseProps>(drawEllipse);

/**
 * SolidJS component that renders an ellipse on the canvas
 *
 * @example
 * ```tsx
 * <Ellipse
 *   id="my-ellipse"
 *   center={Point.from(0, 0, 0)}
 *   width={100}
 *   height={60}
 *   color="#ff6600"
 *   strokeWidth={2}
 * />
 * ```
 */
export const Ellipse: Component<EllipseProps> = (props) => {
  useShapeBoundsRegistration(props.id, () => ({
    minX: props.center.x - props.width / 2,
    minY: props.center.y - props.height / 2,
    maxX: props.center.x + props.width / 2,
    maxY: props.center.y + props.height / 2,
  }));
  return EllipseBase(props);
};
