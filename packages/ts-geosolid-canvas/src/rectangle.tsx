import { createSignal, createEffect, useContext } from 'solid-js';
import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';
import { selectionContext, useShapeBoundsRegistration, useTransformHandler } from './canvas/selection.ts';
import type { BoundingBox } from './types.ts';
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
 * SolidJS component that renders a rectangle on the canvas.
 * When placed inside a Select2D, automatically registers a transform
 * handler so committed translate/scale operations update the shape
 * in-place.
 */
export const Rectangle: Component<RectangleProps> = (props) => {
  const selCtx = useContext(selectionContext);
  const [center, setCenter] = createSignal(props.center);
  const [w, setW] = createSignal(props.width);
  const [h, setH] = createSignal(props.height);

  createEffect(() => setCenter(props.center));
  createEffect(() => setW(props.width));
  createEffect(() => setH(props.height));

  const getBounds = (): BoundingBox => {
    const c = center();
    return {
      min: Point.from(c.x - w() / 2, c.y - h() / 2, 0),
      max: Point.from(c.x + w() / 2, c.y + h() / 2, 0),
    };
  };

  useShapeBoundsRegistration(props.id, getBounds);

  useTransformHandler(props.id, (commit) => {
    if (commit.type === 'translate') {
      setCenter((p) => p.add(commit.delta));
    } else if (commit.type === 'scale') {
      const { scale, pivot } = commit;
      setCenter((p) =>
        Point.from(
          pivot.x + scale.x * (p.x - pivot.x),
          pivot.y + scale.y * (p.y - pivot.y),
          0,
        ),
      );
      setW((v) => v * Math.abs(scale.x));
      setH((v) => v * Math.abs(scale.y));
    }
    selCtx.registerBounds(props.id, getBounds());
  });

  const merged = new Proxy(props, {
    get(target, key): unknown {
      if (key === 'center') { return center(); }
      if (key === 'width') { return w(); }
      if (key === 'height') { return h(); }
      return (target as unknown as Record<string | symbol, unknown>)[key];
    },
  });

  return RectangleBase(merged);
};
