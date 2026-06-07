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
  screenPoint,
  screenToWorldPoint,
  worldToScreenPoint,
} from "./canvas/geo-utils.ts";

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
 *
 * @param props       Component props (must have `editable`).
 * @param getCanvas   Returns the canvas element (called inside event
 *                    handlers, not tracked by Solid).
 * @param getHandles  Returns the current handle world‑space positions.
 * @param getTransform Returns the current world‑to‑screen transform.
 * @param onDrag      Called on pointermove while dragging. Receives the
 *                    handle index, the world‑space delta, the captured
 *                    startWorld/handle position, and the startScreen.
 * @param onDragStart Optional — called on pointerdown when a handle is
 *                    hit, after drag state is set. Use for shape‑specific
 *                    setup (e.g. computing a pivot corner).
 * @param onDragEnd   Optional cleanup after drag ends (e.g. null a pivot).
 * @returns           A reactive `DragState` store. Use `.hoveredIndex`
 *                    for handle rendering.
 */
export function useEditableDrag(
  props: { editable?: boolean },
  getCanvas: () => HTMLCanvasElement | undefined,
  getHandles: () => Point[],
  getTransform: () => Transform,
  onDrag: (
    index: number,
    worldDelta: Vector,
    startWorld: Point,
    startScreen: Point,
  ) => void,
  onDragStart?: (
    index: number,
    startWorld: Point,
    startScreen: Point,
    handles: Point[],
  ) => void,
  onDragEnd?: () => void,
): DragState {
  const [drag, setDrag] = createStore<DragState>({
    index: -1,
    startWorld: null,
    startScreen: null,
    hoveredIndex: -1,
  });

  createEffect(() => {
    if (props.editable !== true) {
      return;
    }

    const canvas = untrack(getCanvas);
    if (!canvas) {
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      const sp = screenPoint(e, canvas);
      const transform = getTransform();
      const handles = getHandles();
      const found = hitTestHandle(
        handles.map((h) => worldToScreenPoint(transform, h)),
        sp,
      );
      if (found !== -1) {
        e.stopImmediatePropagation();
        setDrag({
          index: found,
          startWorld: handles[found]!,
          startScreen: sp,
        });
        onDragStart?.(found, handles[found]!, sp, handles);
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const sp = screenPoint(e, canvas);

      if (drag.index !== -1) {
        e.stopImmediatePropagation();
        const transform = getTransform();
        const startScreen = drag.startScreen;
        const startWorld = drag.startWorld;
        if (!transform || !startScreen || !startWorld) {
          return;
        }

        const worldNow = screenToWorldPoint(transform, sp);
        const worldStart = screenToWorldPoint(transform, startScreen);
        const worldDelta = Vector.fromPoints(worldNow, worldStart);
        onDrag(drag.index, worldDelta, startWorld, startScreen);
        return;
      }

      const transform = getTransform();
      if (transform) {
        const handleFound = hitTestHandle(
          getHandles().map((h) => worldToScreenPoint(transform, h)),
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
      onDragEnd?.();
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
