import {
  createEffect,
  createRenderEffect,
  createSignal,
  useContext,
} from 'solid-js';
import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';
import { Point, Transform } from '@micurs/ts-geopro';
import { getScaledWidth, requestRedrawIfNeeded } from './canvas/utils.ts';
import { drawHandles } from './canvas/drawing.ts';
import {
  drawInScreenCoordinates,
  drawInWorldCoordinates,
  worldPointToScreen,
} from './canvas/canvas-geopro.ts';
import { canvasContext } from './canvas/canvas-context.ts';
import {
  selectionContext,
  useShapeBoundsRegistration,
  useTransformHandler,
} from './canvas/selection.ts';
import type { BoundingBox, DrawableProps } from './types.ts';
import { useEditableDrag } from './use-editable-drag.ts';

export interface RoundedRectangleProps extends DrawableProps {
  center: Point;
  width: number;
  height: number;
  /** Corner radius in world units. Clamped to `0..min(width, height)/2`. */
  radius: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * Clamp a corner radius so it always fits the rectangle:
 * `0 ≤ r ≤ min(width, height) / 2`.
 *
 * Reused after every prop update, direct handle edit, and selection commit
 * so the rendered shape and the editable handle stay consistent.
 */
export const clampRadius = (r: number, w: number, h: number): number => {
  const max = Math.min(w, h) / 2;
  if (!Number.isFinite(max) || max < 0) {
    return 0;
  }
  if (Number.isNaN(r)) {
    return 0;
  }
  if (!Number.isFinite(r)) {
    return max;
  }
  if (r < 0) {
    return 0;
  }
  return r > max ? max : r;
};

/**
 * Draw a rounded rectangle on the canvas viewport using portable path
 * commands (`moveTo`, `lineTo`, `arcTo`) so the result does not depend on
 * the newer `ctx.roundRect` helper.
 *
 * The path is built in world coordinates (Y-up) and relies on the active
 * canvas transform (set by `drawInWorldCoordinates`) for the Y-negated
 * render. With `r = 0` the arc calls collapse to straight segments and the
 * path is identical to a plain rectangle.
 *
 * @param vp   - The viewport context (canvas + scale factor).
 * @param rect - Rounded rectangle properties (center, dimensions, radius, style).
 */
export const drawRoundedRectangle = (
  vp: Viewport,
  rect: RoundedRectangleProps,
): void => {
  const { ctx, scaleFactor } = vp;
  ctx.strokeStyle = rect.color || 'black';
  ctx.lineWidth = getScaledWidth(rect.strokeWidth ?? 1, scaleFactor);

  const w = rect.width;
  const h = rect.height;
  const r = clampRadius(rect.radius, w, h);
  const hw = w / 2;
  const hh = h / 2;
  const c = rect.center;
  // World-space edges (Y-up: top = max y, bottom = min y).
  const xLeft = c.x - hw;
  const xRight = c.x + hw;
  const yTop = c.y + hh;
  const yBottom = c.y - hh;

  ctx.beginPath();
  // Start on the top edge just past the top-left arc, then walk CW in world
  // coordinates (which appears CCW on the Y-negated screen).
  ctx.moveTo(xLeft + r, yTop);
  ctx.lineTo(xRight - r, yTop);
  ctx.arcTo(xRight, yTop, xRight, yTop - r, r);
  ctx.lineTo(xRight, yBottom + r);
  ctx.arcTo(xRight, yBottom, xRight - r, yBottom, r);
  ctx.lineTo(xLeft + r, yBottom);
  ctx.arcTo(xLeft, yBottom, xLeft, yBottom + r, r);
  ctx.lineTo(xLeft, yTop - r);
  ctx.arcTo(xLeft, yTop, xLeft + r, yTop, r);
  ctx.closePath();

  if (rect.fill) {
    ctx.fillStyle = rect.fill;
    ctx.fill();
  }
  ctx.stroke();
};

export const RoundedRectangle: Component<RoundedRectangleProps> = (props) => {
  const canvasCtx = useContext(canvasContext);
  const selCtx = useContext(selectionContext);
  const [center, setCenter] = createSignal(props.center);
  const [w, setW] = createSignal(props.width);
  const [h, setH] = createSignal(props.height);
  const [radius, setRadius] = createSignal(clampRadius(props.radius, props.width, props.height));

  // Keep local state in sync with incoming props, re-clamping the radius
  // against the latest width/height so a prop change never leaves the shape
  // in an invalid state.
  createEffect(() => {
    const nextW = props.width;
    const nextH = props.height;
    setW(nextW);
    setH(nextH);
    setRadius(clampRadius(props.radius, nextW, nextH));
  });
  createEffect(() => setCenter(props.center));

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
      const factor = Math.min(Math.abs(scale.x), Math.abs(scale.y));
      setRadius((r) => clampRadius(r * factor, w(), h()));
    }
    selCtx.registerBounds(props.id, getBounds());
  });

  function getWorldCorners(): Point[] {
    const c = center();
    const hw = w() / 2;
    const hh = h() / 2;
    // Order: BL, BR, TR, TL (matches Rectangle so Select2D invariants hold).
    return [
      Point.from(c.x - hw, c.y - hh, 0),
      Point.from(c.x + hw, c.y - hh, 0),
      Point.from(c.x + hw, c.y + hh, 0),
      Point.from(c.x - hw, c.y + hh, 0),
    ];
  }

  /**
   * Draw-handle order. The radius handle is intentionally placed FIRST so
   * `hitTestHandle` (which returns the first matching index) resolves overlap
   * in favor of the radius handle. This makes a `radius={0}` shape — where
   * the radius handle sits exactly on the TL corner — still draggable to
   * grow the radius instead of being shadowed by the corner resize handle.
   *
   * Index 0     → radius handle on the top edge at the top-left arc tangent
   *               point (`topLeft + (r, 0)` in world Y-up).
   * Indices 1..4 → corner resize handles in BL, BR, TR, TL order.
   *
   * Dragging the radius handle along the top edge changes the radius: the
   * horizontal distance from the top-left corner to the new handle position
   * is the candidate radius (then clamped). Vertical motion is ignored.
   */
  function getWorldHandles(): Point[] {
    const corners = getWorldCorners();
    const c = center();
    const r = radius();
    const radiusHandle = Point.from(c.x - w() / 2 + r, c.y + h() / 2, 0);
    return [radiusHandle, ...corners];
  }

  let pivot: Point | null = null;

  const drag = useEditableDrag({
    editable: () => props.editable === true,
    getCanvas: () => canvasCtx?.vp()?.ctx.canvas,
    getHandles: getWorldHandles,
    getTransform: () => {
      const vp = canvasCtx?.vp();
      return vp?.transform ?? Transform.identity();
    },
    onDragStart: (index, _startWorld, _startScreen, _handles) => {
      if (index === 0) {
        // Radius handle — no opposite-corner pivot.
        pivot = null;
      } else if (index >= 1 && index <= 4) {
        // Corner handle: translate to underlying corner index 0..3 and
        // take the diagonal opposite ((i+2) mod 4).
        const cornerIdx = index - 1;
        const opp = (cornerIdx + 2) % 4;
        pivot = getWorldCorners()[opp]!;
      }
    },
    onDrag: (index, worldDelta, startWorld) => {
      if (index === 0) {
        // Radius handle on the top edge. Horizontal distance from the
        // top-left corner to the current mouse world position gives the
        // candidate radius; vertical motion is ignored.
        const c = center();
        const tlx = c.x - w() / 2;
        const mouse = startWorld.add(worldDelta);
        setRadius(clampRadius(Math.max(0, mouse.x - tlx), w(), h()));
        return;
      }
      if (index >= 1 && index <= 4) {
        if (!pivot) {
          return;
        }
        const newCorner = startWorld.add(worldDelta);
        setCenter(Point.from(
          (pivot.x + newCorner.x) / 2,
          (pivot.y + newCorner.y) / 2,
          0,
        ));
        setW(Math.abs(newCorner.x - pivot.x));
        setH(Math.abs(newCorner.y - pivot.y));
        // Keep radius valid against the new dimensions.
        setRadius((r) => clampRadius(r, w(), h()));
      }
    },
    onDragEnd: () => {
      pivot = null;
    },
  });

  // Single drawing effect: base shape + optional handles.
  createRenderEffect(() => {
    canvasCtx?.redrawVersion();
    const vp = canvasCtx?.vp();
    if (!vp) {
      return;
    }

    drawInWorldCoordinates(vp.ctx, vp.transform, () => {
      drawRoundedRectangle(vp, {
        ...props,
        center: center(),
        width: w(),
        height: h(),
        radius: radius(),
      });
    });

    if (props.editable) {
      drawInScreenCoordinates(vp.ctx, () => {
        drawHandles(
          vp.ctx,
          getWorldHandles().map((p) => worldPointToScreen(vp.transform, p)),
          drag.hoveredIndex,
        );
      });
    }

    requestRedrawIfNeeded(canvasCtx);
  });

  return null;
};
