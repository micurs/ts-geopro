import { createEffect, createMemo, createSignal, onCleanup, untrack, useContext } from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { selectionContext } from "./canvas/selection.ts";
import { worldToScreenPoint } from "./canvas/utils.ts";
import type { BoundingBox } from "./canvas/selection.ts";

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

interface SelectionRefs {
  positions: [number, number][];
  sMinX: number;
  sMinY: number;
  sMaxX: number;
  sMaxY: number;
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
        sel.positions.length > 0 &&
        sx >= sel.sMinX &&
        sx <= sel.sMaxX &&
        sy >= sel.sMinY &&
        sy <= sel.sMaxY,
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

  const selRefs: SelectionRefs = {
    positions: [],
    sMinX: 0,
    sMinY: 0,
    sMaxX: 0,
    sMaxY: 0,
  };

  createEffect(() => {
    ctx?.redrawVersion();
    const vp = ctx?.vp();
    const box = unionBounds();
    const hovBox = hoveredBox();
    const hovHandle = hoveredHandle();

    if (!vp) {
      return;
    }
    if (!box) {
      selRefs.sMinX = 0;
      selRefs.sMinY = 0;
      selRefs.sMaxX = 0;
      selRefs.sMaxY = 0;
      selRefs.positions = [];
      if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
        ctx?.requestRedraw();
      }
      return;
    }

    const p = padding();
    const col = color();
    const M = vp.transform;

    const corners: [number, number][] = [
      [box.minX - p, box.minY - p],
      [box.maxX + p, box.minY - p],
      [box.maxX + p, box.maxY + p],
      [box.minX - p, box.maxY + p],
    ];
    let sMinX = Infinity;
    let sMinY = Infinity;
    let sMaxX = -Infinity;
    let sMaxY = -Infinity;
    for (const [wx, wy] of corners) {
      const [sx, sy] = worldToScreenPoint(M, wx, wy);
      sMinX = Math.min(sMinX, sx);
      sMinY = Math.min(sMinY, sy);
      sMaxX = Math.max(sMaxX, sx);
      sMaxY = Math.max(sMaxY, sy);
    }

    selRefs.sMinX = sMinX;
    selRefs.sMinY = sMinY;
    selRefs.sMaxX = sMaxX;
    selRefs.sMaxY = sMaxY;

    const midX = (sMinX + sMaxX) / 2;
    selRefs.positions = [
      [sMinX, sMinY],
      [sMaxX, sMinY],
      [sMaxX, sMaxY],
      [sMinX, sMaxY],
      [midX, sMinY - ROTATION_HANDLE_OFFSET],
    ];

    vp.ctx.save();
    vp.ctx.setTransform(1, 0, 0, 1, 0, 0);

    vp.ctx.globalAlpha = hovBox ? 1 : 0.7;
    vp.ctx.strokeStyle = col;
    vp.ctx.lineWidth = hovBox ? 2 : 1;
    vp.ctx.setLineDash([6, 4]);

    vp.ctx.strokeRect(sMinX, sMinY, sMaxX - sMinX, sMaxY - sMinY);

    // rotation handle connector line
    vp.ctx.beginPath();
    vp.ctx.moveTo(midX, sMinY);
    vp.ctx.lineTo(midX, sMinY - ROTATION_HANDLE_OFFSET);
    vp.ctx.stroke();

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
    const vp = ctx?.vp();
    const canvas = vp?.ctx.canvas;
    if (!canvas) {
      return;
    }

    const onPointerMove = createPointerMoveHandler(
      selRefs,
      setHoveredHandle,
      setHoveredBox,
    );

    const onPointerLeave = () => {
      setHoveredBox(false);
      setHoveredHandle(-1);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    onCleanup(() => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    });
  });

  const ctxValue = {
    vp: ctx?.vp ?? (() => undefined),
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
