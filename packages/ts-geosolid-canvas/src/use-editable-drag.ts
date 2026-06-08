import {
  createEffect,
  onCleanup,
  untrack,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Vector, Transform } from "@micurs/ts-geopro";
import type { Point } from "@micurs/ts-geopro";
import type { DragState } from "./types.ts";
import {
  captureMouseEvents,
  hitTestHandle,
} from "./canvas/geo-utils.ts";
import {
  canvasPointFromEvent,
  screenPointToWorld,
  worldPointToScreen,
} from "./canvas/canvas-geopro.ts";

export interface UseEditableDragOptions {
  /** Accessor returning true when handle drag interaction is enabled. Called
   * inside the effect so Solid tracks it reactively — toggling this after
   * mount correctly adds/removes the capture-phase listeners. */
  editable: () => boolean;
  /** Returns the canvas element (called inside event handlers, not tracked by Solid) */
  getCanvas: () => HTMLCanvasElement | undefined;
  /** Returns the current handle world-space positions */
  getHandles: () => Point[];
  /** Returns the current world-to-screen transform */
  getTransform: () => Transform;
  /** Called on pointermove while dragging */
  onDrag: (
    index: number,
    worldDelta: Vector,
    startWorld: Point,
    startScreen: Point,
  ) => void;
  /** Optional — called on pointerdown when a handle is hit, after drag state is set */
  onDragStart?: (
    index: number,
    startWorld: Point,
    startScreen: Point,
    handles: Point[],
  ) => void;
  /** Optional cleanup after drag ends */
  onDragEnd?: () => void;
}

/**
 * Shared hook for editable-handle drag interaction on canvas shapes.
 *
 * Manages a `DragState` store and sets up stable capture‑phase pointer
 * listeners (`pointerdown` / `pointermove` / `pointerup`) that survive
 * SolidJS effect re‑runs. The `onDrag` callback receives the world‑space
 * delta computed through the full viewport transform (including rotation,
 * scale, Y‑negation), so handle drag works under any parent transform.
 *
 * Each shape provides its own `onDrag` to interpret the delta — store the
 * returned `drag` object and read `drag.hoveredIndex` in your
 * `createRenderEffect` to draw highlighted handles.
 */
export function useEditableDrag(options: UseEditableDragOptions): DragState {
  const [drag, setDrag] = createStore<DragState>({
    index: -1,
    startWorld: null,
    startScreen: null,
    hoveredIndex: -1,
  });

  createEffect(() => {
    if (!options.editable()) {
      return;
    }

    const canvas = untrack(options.getCanvas);
    if (!canvas) {
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      const sp = canvasPointFromEvent(canvas, e);
      const transform = options.getTransform();
      const handles = options.getHandles();
      const found = hitTestHandle(
        handles.map((h) => worldPointToScreen(transform, h)),
        sp,
      );
      if (found !== -1) {
        e.stopImmediatePropagation();
        setDrag({
          index: found,
          startWorld: handles[found]!,
          startScreen: sp,
        });
        options.onDragStart?.(found, handles[found]!, sp, handles);
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const sp = canvasPointFromEvent(canvas, e);

      if (drag.index !== -1) {
        e.stopImmediatePropagation();
        const transform = options.getTransform();
        const startScreen = drag.startScreen;
        const startWorld = drag.startWorld;
        if (!transform || !startScreen || !startWorld) {
          return;
        }

        const worldNow = screenPointToWorld(transform, sp);
        const worldStart = screenPointToWorld(transform, startScreen);
        const worldDelta = Vector.fromPoints(worldNow, worldStart);
        options.onDrag(drag.index, worldDelta, startWorld, startScreen);
        return;
      }

      const transform = options.getTransform();
      if (transform) {
        const handleFound = hitTestHandle(
          options.getHandles().map((h) => worldPointToScreen(transform, h)),
          sp,
        );
        setDrag("hoveredIndex", handleFound);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (drag.index === -1) {
        return;
      }
      e.stopImmediatePropagation();
      setDrag({ index: -1, startWorld: null, startScreen: null });
      options.onDragEnd?.();
    };

    const cleanup = captureMouseEvents(
      canvas,
      onPointerDown,
      onPointerMove,
      onPointerUp,
    );
    onCleanup(cleanup);
  });

  return drag;
}
