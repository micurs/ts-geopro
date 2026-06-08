import {
  createEffect,
  createRenderEffect,
  createSignal,
  useContext,
} from "solid-js";
import type { Component } from "solid-js";
import type { Viewport } from "./canvas/types.ts";
import { Point, Transform } from "@micurs/ts-geopro";
import { getScaledWidth, requestRedrawIfNeeded } from "./canvas/utils.ts";
import { drawHandles } from "./canvas/drawing.ts";
import {
  drawInScreenCoordinates,
  drawInWorldCoordinates,
  worldPointToScreen,
} from "./canvas/canvas-geopro.ts";
import { canvasContext } from "./canvas/canvas-context.ts";
import {
  selectionContext,
  useShapeBoundsRegistration,
  useTransformHandler,
} from "./canvas/selection.ts";
import type { BoundingBox, DrawableProps } from "./types.ts";
import { useEditableDrag } from "./use-editable-drag.ts";

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
  ctx.strokeStyle = rect.color || "black";
  ctx.lineWidth = getScaledWidth(rect.strokeWidth ?? 1, scaleFactor);

  const tlX = rect.center.x - rect.width / 2;
  const tlY = rect.center.y - rect.height / 2;

  if (rect.fill) {
    ctx.fillStyle = rect.fill;
    ctx.fillRect(tlX, tlY, rect.width, rect.height);
  }

  ctx.strokeRect(tlX, tlY, rect.width, rect.height);
};

export const Rectangle: Component<RectangleProps> = (props: RectangleProps) => {
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
    if (commit.type === "translate") {
      setCenter((p) => p.add(commit.delta));
    } else if (commit.type === "scale") {
      const { scale, pivot } = commit;
      setCenter((p) =>
        Point.from(
          pivot.x + scale.x * (p.x - pivot.x),
          pivot.y + scale.y * (p.y - pivot.y),
          0,
        )
      );
      setW((v) => v * Math.abs(scale.x));
      setH((v) => v * Math.abs(scale.y));
    }
    selCtx.registerBounds(props.id, getBounds());
  });

  function getWorldCorners(): Point[] {
    const c = center();
    const hw = w() / 2;
    const hh = h() / 2;
    return [
      Point.from(c.x - hw, c.y - hh, 0),
      Point.from(c.x + hw, c.y - hh, 0),
      Point.from(c.x + hw, c.y + hh, 0),
      Point.from(c.x - hw, c.y + hh, 0),
    ];
  }

  let pivot: Point | null = null;

  const drag = useEditableDrag({
    editable: () => props.editable === true,
    getCanvas: () => canvasCtx?.vp()?.ctx.canvas,
    getHandles: getWorldCorners,
    getTransform: () => {
      const vp = canvasCtx?.vp();
      return vp?.transform ?? Transform.identity();
    },
    onDrag: (_index, worldDelta, startWorld) => {
      const newCorner = startWorld.add(worldDelta);
      if (pivot) {
        setCenter(Point.from(
          (pivot.x + newCorner.x) / 2,
          (pivot.y + newCorner.y) / 2,
          0,
        ));
        setW(Math.abs(newCorner.x - pivot.x));
        setH(Math.abs(newCorner.y - pivot.y));
      }
    },
    onDragStart: (_index, _startWorld, _startScreen, handles) => {
      const opp = (_index + 2) % 4;
      pivot = handles[opp]!;
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
      drawRectangle(vp, {
        ...props,
        center: center(),
        width: w(),
        height: h(),
      });
    });

    if (props.editable) {
      drawInScreenCoordinates(vp.ctx, () => {
        drawHandles(
          vp.ctx,
          getWorldCorners().map((c) => worldPointToScreen(vp.transform, c)),
          drag.hoveredIndex,
        );
      });
    }

    requestRedrawIfNeeded(canvasCtx);
  });

  return null;
};
