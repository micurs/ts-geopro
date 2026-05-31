import { createContext, createEffect, onCleanup, useContext } from 'solid-js';
import { Point, Vector } from "@micurs/ts-geopro";
import type { BoundingBox } from "../types.ts";

/**
 * Committed transform dispatched to children when a Select2D operation
 * (translate, scale, or rotate) completes. Children apply it to their
 * own world-space data so Select2D can reset its internal deltas to a
 * clean baseline.
 *
 * - `translate`: move every defining point by `delta` in world units (Y-up).
 * - `scale`: scale every defining point around `pivot` by `scale` factors,
 *   then scale any width/height dimensions by the same factors.
 */
export type SelectionCommit =
  | { type: 'translate'; delta: Vector }
  | { type: 'scale'; scale: Vector; pivot: Point };

export interface SelectionContextValue {
  registerBounds: (id: string, box: BoundingBox) => void;
  unregisterBounds: (id: string) => void;
  registerTransformHandler: (id: string, handler: (commit: SelectionCommit) => void) => void;
  unregisterTransformHandler: (id: string) => void;
}

export const selectionContext = createContext<SelectionContextValue>({
  registerBounds: () => {},
  unregisterBounds: () => {},
  registerTransformHandler: () => {},
  unregisterTransformHandler: () => {},
});

export function useShapeBoundsRegistration(
  id: string,
  getBounds: () => BoundingBox,
): void {
  const ctx = useContext(selectionContext);
  if (!ctx) {
    return;
  }
  createEffect(() => {
    ctx.registerBounds(id, getBounds());
    onCleanup(() => ctx.unregisterBounds(id));
  });
}

/**
 * Register a transform handler for a shape inside a Select2D.
 * When the selection commits a translate or scale, `apply` is called
 * so the shape can update its own signals. If there is no surrounding
 * selectionContext the call is a no-op.
 */
export function useTransformHandler(
  id: string,
  apply: (commit: SelectionCommit) => void,
): void {
  const ctx = useContext(selectionContext);
  if (!ctx) {
    return;
  }
  createEffect(() => {
    ctx.registerTransformHandler(id, apply);
    onCleanup(() => ctx.unregisterTransformHandler(id));
  });
}
