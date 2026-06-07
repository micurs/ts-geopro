import { createSignal, createEffect, createRenderEffect, untrack, useContext } from 'solid-js';
import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point, Transform } from '@micurs/ts-geopro';
import { getScaledWidth } from './canvas/utils.ts';
import { drawHandles } from './canvas/drawing.ts';
import { worldToScreenPoint } from './canvas/geo-utils.ts';
import { canvasContext } from './canvas/canvas-context.ts';
import { selectionContext, useShapeBoundsRegistration, useTransformHandler } from './canvas/selection.ts';
import type { BoundingBox, DrawableProps } from './types.ts';
import { useEditableDrag } from './use-editable-drag.ts';

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

export const Ellipse: Component<EllipseProps> = (props) => {
  const canvasCtx = useContext(canvasContext);
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

  function getHandleWorld(): Point[] {
    const c = center();
    const rx = w() / 2;
    const ry = h() / 2;
    return [
      Point.from(c.x + rx, c.y, 0),
      Point.from(c.x, c.y + ry, 0),
    ];
  }

  const drag = useEditableDrag(
    props,
    () => canvasCtx?.vp()?.ctx.canvas,
    getHandleWorld,
    () => {
      const vp = canvasCtx?.vp();
      return vp?.transform ?? Transform.identity();
    },
    (index, worldDelta, startWorld) => {
      if (index === 0) {
        const newRx = Math.max(1, (startWorld.x + worldDelta.x) - center().x);
        setW(newRx * 2);
      } else {
        const newRy = Math.max(1, (startWorld.y + worldDelta.y) - center().y);
        setH(newRy * 2);
      }
    },
  );

  // Single drawing effect: base shape + optional handles.
  createRenderEffect(() => {
    canvasCtx?.redrawVersion();
    const vp = canvasCtx?.vp();
    if (!vp) {
      return;
    }

    vp.ctx.save();
    vp.ctx.setTransform(
      vp.transform.direct(0, 0),
      -vp.transform.direct(1, 0),
      vp.transform.direct(0, 1),
      -vp.transform.direct(1, 1),
      vp.transform.direct(3, 0),
      vp.transform.direct(3, 1),
    );
    drawEllipse(vp, {
      ...props,
      center: center(),
      width: w(),
      height: h(),
    });
    vp.ctx.restore();

    if (props.editable) {
      vp.ctx.save();
      vp.ctx.setTransform(1, 0, 0, 1, 0, 0);

      drawHandles(
        vp.ctx,
        getHandleWorld().map((h) => worldToScreenPoint(vp.transform, h)),
        drag.hoveredIndex,
      );

      vp.ctx.restore();
    }

    if (!untrack(() => canvasCtx?.rAFWillClear() ?? false)) {
      canvasCtx?.requestRedraw();
    }
  });

  return null;
};
