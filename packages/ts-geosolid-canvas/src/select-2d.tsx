import { createEffect, createMemo, createSignal, onCleanup, untrack, useContext } from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { selectionContext } from "./canvas/selection.ts";
import { worldToScreenPoint } from "./canvas/utils.ts";
import { drawCenterCrosshair, drawPointerLine, drawRotationArc } from "./canvas/drawing.ts";
import type { BoundingBox } from "./canvas/selection.ts";
import { compose, Transform, Vector } from "@micurs/ts-geopro";

export interface Select2DProps {
  children: JSX.Element;
  /** Selection dashed border color (default: '#00aaff') */
  color?: string;
  /** Handle fill color (default: '#ffffff') */
  handleColor?: string;
  /** Handle fill color when hovered (default: '#ffdd00') */
  handleHighlightColor?: string;
  /** Padding around union bounds in world units (default: 6) */
  padding?: number;
}

const DEFAULT_COLOR = "#00aaff";
const DEFAULT_HANDLE_COLOR = "#ffffff";
const DEFAULT_HANDLE_HIGHLIGHT_COLOR = "#ffdd00";
const DEFAULT_PADDING = 6;

const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 7;
const ROTATION_HANDLE_OFFSET = 20;

/**
 * Check whether a screen-space point lies inside a convex polygon.
 * Uses the cross-product sign test: all cross products from consecutive
 * edges to the point must have the same sign for a point to be inside.
 *
 * @param sx - point X (screen pixels)
 * @param sy - point Y (screen pixels)
 * @param corners - polygon vertices in order (screen pixel coords)
 * @returns true if (sx, sy) is inside the convex polygon
 */
function pointInConvexPolygon(
  sx: number, sy: number, corners: [number, number][],
): boolean {
  let pos = false;
  let neg = false;
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    const [ax, ay] = corners[i]!;
    const [bx, by] = corners[j]!;
    const cross = (bx - ax) * (sy - ay) - (by - ay) * (sx - ax);
    if (cross > 0) pos = true;
    if (cross < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

interface SelectionRefs {
  positions: [number, number][];
}

/**
 * Creates a pointer move handler for hit-testing selection handles and box.
 * Caches bounds and handle positions via the `sel` ref object, updated each
 * frame by the draw effect.
 */
function createPointerMoveHandler(
  sel: SelectionRefs,
  setHoveredHandle: (v: number) => void,
  setHoveredBox: (v: boolean) => void,
): (e: PointerEvent) => void {
  return (e: PointerEvent) => {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    let found = -1;
    for (let i = 0; i < sel.positions.length; i++) {
      const [hx, hy] = sel.positions[i]!;
      const dx = sx - hx;
      const dy = sy - hy;
      if (dx * dx + dy * dy < HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
        found = i;
        break;
      }
    }
    setHoveredHandle(found);

    setHoveredBox(
      found === -1 &&
        sel.positions.length >= 4 &&
        pointInConvexPolygon(sx, sy, sel.positions.slice(0, 4) as [number, number][]),
    );
  };
}

export const Select2D: Component<Select2DProps> = (props) => {
  const ctx = useContext(canvasContext);
  const [boundsMap, setBoundsMap] = createSignal<Map<string, BoundingBox>>(
    new Map(),
  );

  const selValue = {
    registerBounds: (id: string, box: BoundingBox) => {
      setBoundsMap((prev) => {
        const next = new Map(prev);
        next.set(id, box);
        return next;
      });
    },
    unregisterBounds: (id: string) => {
      setBoundsMap((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
  };

  const unionBounds = createMemo(() => {
    const map = boundsMap();
    if (map.size === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of map.values()) {
      minX = Math.min(minX, box.minX);
      minY = Math.min(minY, box.minY);
      maxX = Math.max(maxX, box.maxX);
      maxY = Math.max(maxY, box.maxY);
    }
    return { minX, minY, maxX, maxY };
  });

  const padding = () => props.padding ?? DEFAULT_PADDING;
  const color = () => props.color ?? DEFAULT_COLOR;
  const handleColor = () => props.handleColor ?? DEFAULT_HANDLE_COLOR;
  const handleHighlightColor = () => props.handleHighlightColor ?? DEFAULT_HANDLE_HIGHLIGHT_COLOR;

  const [hoveredBox, setHoveredBox] = createSignal(false);
  const [hoveredHandle, setHoveredHandle] = createSignal(-1);
  const [dragDelta, setDragDelta] = createSignal(Vector.from(0, 0, 0));

  const [rotationAngle, setRotationAngle] = createSignal(0);
  const [isRotating, setIsRotating] = createSignal(false);
  const [rotPointerPos, setRotPointerPos] = createSignal<[number, number] | null>(null);
  const [rotInitAngle, setRotInitAngle] = createSignal(0);
  const [arcDelta, setArcDelta] = createSignal(0);

  let dragging = false;
  let dragScreenStart: [number, number] | null = null;
  let dragBase = Vector.from(0, 0, 0);

  let rotating = false;
  let rotationBase = 0;
  let lastMouseAngle = 0;

  const childViewport = createMemo(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return undefined;
    }
    const d = dragDelta();
    const angle = rotationAngle();
    const box = unionBounds();

    const translateTx = Transform.fromTranslation(d.x, -d.y, 0);
    let childTx = compose(translateTx, vp.transform);

    if (angle !== 0 && box) {
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      childTx = compose(
        Transform.fromTranslation(-cx, cy, 0),
        Transform.fromRotationZ(angle),
        Transform.fromTranslation(cx, -cy, 0),
        translateTx,
        vp.transform,
      );
    }

    return { ...vp, transform: childTx };
  });

  const selRefs: SelectionRefs = {
    positions: [],
  };

  createEffect(() => {
    ctx?.redrawVersion();
    const vp = childViewport();
    const box = unionBounds();
    const hovBox = hoveredBox();
    const hovHandle = hoveredHandle();
    const rotatingNow = isRotating();
    const rotPtr = rotPointerPos();
    const initAngle = rotInitAngle();
    const rotArcDelta = arcDelta();

    if (!vp) {
      return;
    }
    if (!box) {
      selRefs.positions = [];
      if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
        ctx?.requestRedraw();
      }
      return;
    }

    const p = padding();
    const col = color();
    const M = vp.transform;

    const worldCorners: [number, number][] = [
      [box.minX - p, box.minY - p],
      [box.maxX + p, box.minY - p],
      [box.maxX + p, box.maxY + p],
      [box.minX - p, box.maxY + p],
    ];

    const screenCorners = worldCorners.map(
      ([wx, wy]) => worldToScreenPoint(M, wx, wy),
    ) as [number, number][];

    const c0 = screenCorners[3]!;
    const c1 = screenCorners[2]!;

    const topMidX = (c0[0] + c1[0]) / 2;
    const topMidY = (c0[1] + c1[1]) / 2;

    const eX = c1[0] - c0[0];
    const eY = c1[1] - c0[1];
    const eLen = Math.sqrt(eX * eX + eY * eY);

    const sc0 = screenCorners[0]!;
    const sc2 = screenCorners[2]!;
    const centerX = (sc0[0] + sc2[0]) / 2;
    const centerY = (sc0[1] + sc2[1]) / 2;

    let nX: number;
    let nY: number;
    if (eLen < 1e-9) {
      // Degenerate top edge: outward normal is direction from center to topMid
      const dx = topMidX - centerX;
      const dy = topMidY - centerY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-9) {
        nX = 0;
        nY = -1;
      } else {
        nX = dx / len;
        nY = dy / len;
      }
    } else {
      const outwardCW = (topMidX - centerX) * (eY / eLen) + (topMidY - centerY) * (-eX / eLen);
      nX = outwardCW > 0 ? eY / eLen : -eY / eLen;
      nY = outwardCW > 0 ? -eX / eLen : eX / eLen;
    }

    selRefs.positions = [
      screenCorners[0]!, screenCorners[1]!, screenCorners[2]!, screenCorners[3]!,
      [topMidX + nX * ROTATION_HANDLE_OFFSET, topMidY + nY * ROTATION_HANDLE_OFFSET],
    ];

    vp.ctx.save();
    vp.ctx.setTransform(1, 0, 0, 1, 0, 0);

    vp.ctx.globalAlpha = hovBox ? 1 : 0.7;
    vp.ctx.strokeStyle = col;
    vp.ctx.lineWidth = hovBox ? 2 : 1;
    vp.ctx.setLineDash([6, 4]);

    vp.ctx.beginPath();
    vp.ctx.moveTo(sc0[0], sc0[1]);
    const sc1 = screenCorners[1]!;
    const sc3 = screenCorners[3]!;
    vp.ctx.lineTo(sc1[0], sc1[1]);
    vp.ctx.lineTo(sc2[0], sc2[1]);
    vp.ctx.lineTo(sc3[0], sc3[1]);
    vp.ctx.closePath();
    vp.ctx.stroke();

    const rotHandlePos = selRefs.positions[4]!;
    vp.ctx.beginPath();
    vp.ctx.moveTo(topMidX, topMidY);
    vp.ctx.lineTo(rotHandlePos[0], rotHandlePos[1]);
    vp.ctx.stroke();

    // Center crosshair, only while rotating
    if (rotatingNow) {
      vp.ctx.setLineDash([]);
      drawCenterCrosshair(vp.ctx, centerX, centerY, col);
    }

    // Line and arc from center to mouse cursor while rotating
    if (rotatingNow && rotPtr) {
      drawPointerLine(vp.ctx, centerX, centerY, rotPtr[0], rotPtr[1], col);
      drawRotationArc(vp.ctx, centerX, centerY, 50, initAngle, rotArcDelta, col);
    }

    vp.ctx.globalAlpha = 1;
    vp.ctx.setLineDash([]);

    selRefs.positions.forEach((pos, i) => {
      const [hx, hy] = pos;
      vp.ctx.beginPath();
      vp.ctx.arc(hx, hy, HANDLE_RADIUS, 0, 2 * Math.PI);
      vp.ctx.fillStyle = i === hovHandle ? handleHighlightColor() : handleColor();
      vp.ctx.strokeStyle = "#333333";
      vp.ctx.lineWidth = 1.5;
      vp.ctx.fill();
      vp.ctx.stroke();
    });

    vp.ctx.restore();

    if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
      ctx?.requestRedraw();
    }
  });

  createEffect(() => {
    const vp = childViewport();
    const canvas = vp?.ctx.canvas;
    if (!canvas) {
      return;
    }

    const hoverHandler = createPointerMoveHandler(
      selRefs,
      setHoveredHandle,
      setHoveredBox,
    );

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      for (let i = 0; i < selRefs.positions.length; i++) {
        const [hx, hy] = selRefs.positions[i]!;
        const dx = sx - hx;
        const dy = sy - hy;
        if (dx * dx + dy * dy < HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
          if (i === 4) {
            e.stopImmediatePropagation();
            const p0 = selRefs.positions[0]!;
            const p2 = selRefs.positions[2]!;
            const midX = (p0[0] + p2[0]) / 2;
            const midY = (p0[1] + p2[1]) / 2;
            setRotInitAngle(Math.atan2(sy - midY, sx - midX));
            lastMouseAngle = Math.atan2(sy - midY, sx - midX);
            setArcDelta(0);
            rotationBase = untrack(() => rotationAngle());
            rotating = true;
            setIsRotating(true);
            canvas.setPointerCapture(e.pointerId);
          }
          return;
        }
      }

      if (
        selRefs.positions.length >= 4 &&
        pointInConvexPolygon(sx, sy, selRefs.positions.slice(0, 4) as [number, number][])
      ) {
        e.stopImmediatePropagation();
        dragScreenStart = [sx, sy];
        dragBase = untrack(() => dragDelta());
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (rotating) {
        e.stopImmediatePropagation();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        setRotPointerPos([sx, sy]);
        const p0 = selRefs.positions[0]!;
        const p2 = selRefs.positions[2]!;
        const midX = (p0[0] + p2[0]) / 2;
        const midY = (p0[1] + p2[1]) / 2;
        const curAngle = Math.atan2(sy - midY, sx - midX);
        let delta = curAngle - lastMouseAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        lastMouseAngle = curAngle;
        setArcDelta(prev => {
          let next = prev + delta;
          if (next > Math.PI * 2) next -= Math.PI * 2;
          if (next < -Math.PI * 2) next += Math.PI * 2;
          return next;
        });
        setRotationAngle(rotationBase + curAngle - rotInitAngle());
        return;
      }

      if (dragging && dragScreenStart) {
        e.stopImmediatePropagation();
        const parentVp = ctx?.vp();
        if (parentVp) {
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const sf = parentVp.scaleFactor;
          const worldDx = (sx - dragScreenStart[0]) * sf;
          const worldDy = -(sy - dragScreenStart[1]) * sf;
          setDragDelta(
            Vector.from(dragBase.x + worldDx, dragBase.y + worldDy, 0),
          );
        }
        return;
      }
      hoverHandler(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (rotating) {
        e.stopImmediatePropagation();
        rotating = false;
        setIsRotating(false);
        setRotPointerPos(null);
        return;
      }
      if (dragging) {
        e.stopImmediatePropagation();
        dragging = false;
        dragScreenStart = null;
      }
    };

    const onPointerLeave = () => {
      setHoveredBox(false);
      setHoveredHandle(-1);
    };

    canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
    canvas.addEventListener("pointermove", onPointerMove, { capture: true });
    canvas.addEventListener("pointerup", onPointerUp, { capture: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { capture: true });
    onCleanup(() => {
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      canvas.removeEventListener("pointermove", onPointerMove, { capture: true });
      canvas.removeEventListener("pointerup", onPointerUp, { capture: true });
      canvas.removeEventListener("pointerleave", onPointerLeave, { capture: true });
    });
  });

  const ctxValue = {
    vp: childViewport,
    redrawVersion: ctx?.redrawVersion ?? (() => 0),
    requestRedraw: ctx?.requestRedraw ?? (() => {}),
    rAFWillClear: ctx?.rAFWillClear ?? (() => false),
  };

  return (
    <canvasContext.Provider value={ctxValue}>
      <selectionContext.Provider value={selValue}>
        {props.children}
      </selectionContext.Provider>
    </canvasContext.Provider>
  );
};
