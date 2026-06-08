import { createSignal, onCleanup, onMount } from "solid-js";
import {
  getCanvas,
  getContext,
  getViewport,
  mousePanObserver,
  resizeObserver,
  zoomObserver,
} from "./canvas/utils.ts";

import { drawInScreenCoordinates } from "./canvas/canvas-geopro.ts";
import { canvasContext } from "./canvas/canvas-context.ts";

import type { Component, JSX } from "solid-js";
import type { Coord2D, Options, Size2D, Viewport } from "./canvas/types.ts";

/**
 * Initialize the canvas with the given id and options.
 * @param canvasId - the id of the canvas element
 * @param options - optional settings for zoom, center coordinates, etc.
 */
const initCanvas = (canvasId: string, options: Partial<Options> = {}) => {
  const canvas: HTMLCanvasElement = getCanvas(canvasId);
  const ctx = getContext(canvas);
  const canvasContainerEl = canvas?.parentElement;

  let zoom = options.zoom ?? canvas.clientWidth;
  let pan: Coord2D = options.pan ?? [0.0, 0.0];
  let scaleFactor = 1;

  /**
   * Draw function that updates the viewport signal.
   * Signals the rAF loop that a redraw is needed.
   */
  const draw = () => {
    const dim: Size2D = [canvas.clientWidth, canvas.clientHeight];
    const viewport = getViewport({ canvas, ctx, zoom, pan, dim });
    scaleFactor = viewport.scaleFactor;
    console.log(
      "scaleFactor",
      ((1 + (1 - scaleFactor)) * 100).toFixed(0),
      "%",
      scaleFactor,
    );
    options.render?.(viewport);
    options.requestRedraw?.();
  };

  new ResizeObserver(resizeObserver(canvas, draw))
    .observe(canvasContainerEl!, { box: "content-box" });

  canvas.addEventListener(
    "wheel",
    zoomObserver((z) => {
      zoom = z;
      draw();
    }, zoom),
  );

  mousePanObserver(canvas, pan, (prevPan, dx, dy) => {
    pan = [prevPan[0] + dx * scaleFactor, prevPan[1] + dy * scaleFactor];
    draw();
    return pan;
  });

  draw();
};

interface CanvasProps {
  id: string;
  zoom?: number;
  class?: string;
  children: JSX.Element;
}

export const Canvas: Component<CanvasProps> = (props: CanvasProps) => {
  const [viewport, setViewport] = createSignal<Viewport>();
  const [redrawVersion, setRedrawVersion] = createSignal(0);
  const [rAFWillClear, setRAFWillClear] = createSignal(false);
  let needRedraw = true;
  let rafId: number | undefined;

  const requestRedraw = () => {
    needRedraw = true;
  };

  onMount(() => {
    const options: Partial<Options> = {
      pan: [0.0, 0.0],
      render: setViewport,
      requestRedraw,
    };
    if (props.zoom !== undefined) {
      options.zoom = props.zoom;
    }
    initCanvas(props.id, options);

    // rAF loop: only clear + redraw when something changed
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      if (!needRedraw) {
        return;
      }
      needRedraw = false;
      const vp = viewport();
      if (!vp) {
        return;
      }
      drawInScreenCoordinates(vp.ctx, () => {
        vp.ctx.clearRect(0, 0, vp.ctx.canvas.width, vp.ctx.canvas.height);
      });
      setRAFWillClear(true);
      setRedrawVersion((v) => v + 1);
      setRAFWillClear(false);
    };
    rafId = requestAnimationFrame(loop);
  });

  onCleanup(() => {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
    }
  });

  const context = {
    vp: viewport,
    redrawVersion,
    requestRedraw,
    rAFWillClear,
  };
  return (
    <canvasContext.Provider value={context}>
      <div
        class={props.class ?? "overflow-hidden"}
        id={`${props.id}-container`}
        style="width: 100%; height: 100%;"
      >
        <canvas id={props.id} style="display: block;"></canvas>
        {props.children}
      </div>
    </canvasContext.Provider>
  );
};
