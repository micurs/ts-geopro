import { createEffect, createMemo, createSignal, useContext } from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { selectionContext } from "./canvas/selection.ts";
import { worldToScreenPoint } from "./canvas/utils.ts";
import type { BoundingBox } from "./canvas/selection.ts";

export interface Select2DProps {
  children: JSX.Element;
  /** Selection dashed border color (default: '#00aaff') */
  color?: string;
  /** Padding around union bounds in world units (default: 6) */
  padding?: number;
}

/**
 * Select2D wraps children and draws a dashed bounding box around their
 * registered world-space bounds. Each child with an `id` prop can register
 * its bounds via `useShapeBoundsRegistration`.
 *
 * Note: bounds are registered in local coordinates. Transforms applied by
 * ancestor `Rotation2D` / `Translate2D` components are not yet reflected
 * in the selection rectangle (see #60).
 *
 * @example
 * ```tsx
 * <Select2D padding={2} color="#ff0000">
 *   <Ellipse id="e1" center={Point.from(0, 0, 0)} width={100} height={60} />
 * </Select2D>
 * ```
 */
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

  const padding = () => props.padding ?? 6;
  const color = () => props.color ?? "#00aaff";

  createEffect(() => {
    ctx?.redrawVersion();
    const vp = ctx?.vp();
    const box = unionBounds();

    if (!vp || !box) {
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

    vp.ctx.save();
    vp.ctx.setTransform(1, 0, 0, 1, 0, 0);
    vp.ctx.strokeStyle = col;
    vp.ctx.lineWidth = 1;
    vp.ctx.setLineDash([6, 4]);

    vp.ctx.strokeRect(sMinX, sMinY, sMaxX - sMinX, sMaxY - sMinY);

    vp.ctx.setLineDash([]);
    vp.ctx.restore();
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
