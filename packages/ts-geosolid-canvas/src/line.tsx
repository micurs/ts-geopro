import { Frame, Point, Transform, UnitVector, Vector } from "@micurs/ts-geopro";
import { getScaledWidth } from "./canvas/utils.ts";
import {
  selectionContext,
  useShapeBoundsRegistration,
  useTransformHandler,
} from "./canvas/selection.ts";
import { canvasContext } from "./canvas/canvas-context.ts";
import { drawHandles } from "./canvas/drawing.ts";
import {
  useEditableDrag,
} from "./use-editable-drag.ts";
import { worldToScreenPoint } from "./canvas/geo-utils.ts";
import type { BoundingBox, DrawableProps } from "./types.ts";

import {
  createEffect,
  createRenderEffect,
  createSignal,
  untrack,
  useContext,
} from "solid-js";
import type { Component } from "solid-js";
import type { Viewport } from "./canvas/types.ts";

/**
 * Properties for the Line component
 */
export interface LineProps extends DrawableProps {
  /** Starting point of the line */
  from: Point;
  /** Ending point of the line */
  to: Point;
  /** Line color (default: 'black') */
  color?: string;
  /** Line width in logical units (default: 1) */
  width?: number;
  /** End cap at the start of the line ('arrow', 'circle', or 'none', default: 'none') */
  start?: "none" | "arrow" | "circle";
  /** End cap at the end of the line ('arrow', 'circle', or 'none', default: 'none') */
  end?: "none" | "arrow" | "circle";
  /** Size of the start end cap in logical units (default: 5) */
  startSize?: number;
  /** Size of the end end cap in logical units (default: 5) */
  endSize?: number;
  /** Style of the start end cap ('filled' or 'empty', default: 'empty') */
  startStyle?: "filled" | "empty";
  /** Style of the end end cap ('filled' or 'empty', default: 'empty') */
  endStyle?: "filled" | "empty";
  /** Color for the start end cap (default: inherits line color) */
  startColor?: string;
  /** Color for the end end cap (default: inherits line color) */
  endColor?: string;
}

/**
 * Draw an arrowhead at a specified point
 */
const drawArrowHead = (
  vp: Viewport,
  point: Point,
  direction: UnitVector,
  size: number,
  color: string,
  filled: boolean,
) => {
  const { ctx } = vp;
  const vOut = Vector.from(0, 0, 1);

  const fr = Frame.from2Vectors(point, direction, vOut);
  const arrowScale = size;

  const wingXP = Vector.from(fr.j).scale(arrowScale);
  const wingXM = Vector.from(fr.j).scale(-arrowScale);
  const wingZ = Vector.from(fr.k).scale(-arrowScale * 2);

  const endPoint = point.add(Vector.from(direction).scale(arrowScale));
  const wingStart = endPoint.add(wingZ);
  const wingLeft = wingStart.add(wingXP);
  const wingRight = wingStart.add(wingXM);

  ctx.beginPath();
  ctx.moveTo(wingStart.x, wingStart.y);
  ctx.lineTo(wingLeft.x, wingLeft.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.lineTo(wingRight.x, wingRight.y);
  ctx.lineTo(wingStart.x, wingStart.y);

  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

/**
 * Draw a circle at a specified point
 */
const drawCircle = (
  vp: Viewport,
  point: Point,
  size: number,
  color: string,
  filled: boolean,
) => {
  const { ctx } = vp;
  const radius = size;

  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);

  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

/**
 * Draw a line with optional end caps (arrows or circles) on a canvas viewport
 */
export const drawLine = (vp: Viewport, line: LineProps) => {
  const { ctx, scaleFactor } = vp;
  const lineColor = line.color || "black";

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = getScaledWidth(line.width ?? 1, scaleFactor);
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.stroke();

  switch (line.start) {
    case "arrow": {
      const direction = UnitVector.from(Vector.fromPoints(line.from, line.to));
      const startSize = line.startSize ?? 5;
      const startColor = line.startColor || lineColor;
      const startFilled = line.startStyle === "filled";
      drawArrowHead(
        vp,
        line.from,
        direction,
        startSize,
        startColor,
        startFilled,
      );
      break;
    }
    case "circle": {
      const startSize = line.startSize ?? 5;
      const startColor = line.startColor || lineColor;
      const startFilled = line.startStyle === "filled";
      drawCircle(vp, line.from, startSize, startColor, startFilled);
      break;
    }
  }

  switch (line.end) {
    case "arrow": {
      const direction = UnitVector.from(Vector.fromPoints(line.to, line.from));
      const endSize = line.endSize ?? 5;
      const endColor = line.endColor || lineColor;
      const endFilled = line.endStyle === "filled";
      drawArrowHead(vp, line.to, direction, endSize, endColor, endFilled);
      break;
    }
    case "circle": {
      const endSize = line.endSize ?? 5;
      const endColor = line.endColor || lineColor;
      const endFilled = line.endStyle === "filled";
      drawCircle(vp, line.to, endSize, endColor, endFilled);
      break;
    }
  }
};

export const Line: Component<LineProps> = (props) => {
  const canvasCtx = useContext(canvasContext);
  const selCtx = useContext(selectionContext);
  const [from, setFrom] = createSignal(props.from);
  const [to, setTo] = createSignal(props.to);

  createEffect(() => setFrom(props.from));
  createEffect(() => setTo(props.to));

  const getBounds = (): BoundingBox => {
    const f = from(), t = to();
    return {
      min: Point.from(Math.min(f.x, t.x), Math.min(f.y, t.y), 0),
      max: Point.from(Math.max(f.x, t.x), Math.max(f.y, t.y), 0),
    };
  };

  useShapeBoundsRegistration(props.id, getBounds);

  useTransformHandler(props.id, (commit) => {
    if (commit.type === "translate") {
      setFrom((p) => p.add(commit.delta));
      setTo((p) => p.add(commit.delta));
    } else if (commit.type === "scale") {
      const { scale, pivot } = commit;
      setFrom((p) =>
        Point.from(
          pivot.x + scale.x * (p.x - pivot.x),
          pivot.y + scale.y * (p.y - pivot.y),
          0,
        )
      );
      setTo((p) =>
        Point.from(
          pivot.x + scale.x * (p.x - pivot.x),
          pivot.y + scale.y * (p.y - pivot.y),
          0,
        )
      );
    }
    selCtx.registerBounds(props.id, getBounds());
  });

  // Drag state + stable capture-phase event listeners for editable handles.
  const drag = useEditableDrag(
    props,
    () => canvasCtx?.vp()?.ctx.canvas,
    () => [from(), to()],
    () => {
      const vp = canvasCtx?.vp();
      return vp?.transform ?? Transform.identity();
    },
    (index, worldDelta, startWorld) => {
      if (index === 0) {
        setFrom(startWorld.add(worldDelta));
      } else {
        setTo(startWorld.add(worldDelta));
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

    // Draw base shape.
    vp.ctx.save();
    vp.ctx.setTransform(
      vp.transform.direct(0, 0),
      -vp.transform.direct(1, 0),
      vp.transform.direct(0, 1),
      -vp.transform.direct(1, 1),
      vp.transform.direct(3, 0),
      vp.transform.direct(3, 1),
    );
    drawLine(vp, {
      ...props,
      from: from(),
      to: to(),
    });
    vp.ctx.restore();

    // Draw handles when editable.
    if (props.editable) {
      vp.ctx.save();
      vp.ctx.setTransform(1, 0, 0, 1, 0, 0);

      drawHandles(
        vp.ctx,
        [from(), to()].map((h) => worldToScreenPoint(vp.transform, h)),
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
