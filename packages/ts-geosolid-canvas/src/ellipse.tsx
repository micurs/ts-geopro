import { createSignal, createEffect, useContext } from 'solid-js';
import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { buildCanvasComponent } from './build-canvas-component.tsx';
import { selectionContext, useShapeBoundsRegistration, useTransformHandler } from './canvas/selection.ts';
import type { BoundingBox } from './types.ts';
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
 * SolidJS component that renders an ellipse on the canvas.
 * When placed inside a Select2D, automatically registers a transform
 * handler so committed translate/scale operations update the shape
 * in-place.
 */
export const Ellipse: Component<EllipseProps> = (props) => {
  const selCtx = useContext(selectionContext);
  const [center, setCenter] = createSignal(props.center);
  const [w, setW] = createSignal(props.width);
  const [h, setH] = createSignal(props.height);

  // Sync external prop changes into internal signals
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
    // Synchronous bounds re-registration so Select2D sees the
    // updated geometry before the next interaction starts.
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

  return EllipseBase(merged);
};
