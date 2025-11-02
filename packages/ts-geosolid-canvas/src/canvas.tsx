import { createSignal, onMount } from 'solid-js';
import { clear, getCanvas, getContext, getViewport, mousePanObserver, resizeObserver, zoomObserver } from './canvas/utils.ts';

import { canvasContext } from './canvas/canvas-context.ts';

import type { Component, JSX } from 'solid-js';
import type { Coord2D, Options, Size2D, Viewport } from './canvas/types.ts';

/**
 * Setup transformations on a given canvas context based on the viewport.
 * This function resets the context and applies a transformation matrix
 * that includes translation, rotation, and scaling, while also inverting
 * the Y direction to match the canvas coordinate system.
 * @param ctx - the canvas rendering context to apply transformations to
 * @param viewport - the viewport containing transformation parameters
 */
const setupTransformation = (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
  ctx.reset();
  ctx.setTransform(
    viewport.transform.direct(0, 0), // 2D Rotations and Scale
    viewport.transform.direct(1, 0),
    viewport.transform.direct(0, 1),
    -viewport.transform.direct(1, 1), // Invert the Y direction
    viewport.transform.direct(3, 0), // Translation Components
    viewport.transform.direct(3, 1)
  );
};

/**
 * Initialize the canvas with the given id and options.
 * @param canvasId - the id of the canvas element
 * @param options - optional settings for zoom, center coordinates, etc.
 */
const initCanvas = (canvasId: string, options: Partial<Options> = {}) => {
  const canvas: HTMLCanvasElement = getCanvas(canvasId);
  const ctx = getContext(canvas);
  const canvasContainerEl = canvas?.parentElement;

  let zoom = options.zoom ?? canvas.clientWidth; // Default zoom based on canvas width
  let pan: Coord2D = options.pan ?? [0.0, 0.0];
  let scaleFactor = 1;

  /**
   * Draw function that sets up the viewport and clears the canvas.
   * It calculates the dimensions of the canvas, applies transformations,
   * and calls the render function if provided in options.
   * It also sets the scale factor based on the viewport.
   */
  const draw = () => {
    const dim: Size2D = [canvas.clientWidth, canvas.clientHeight];
    const viewport = getViewport({ canvas, ctx, zoom, pan, dim });
    setupTransformation(ctx, viewport);
    scaleFactor = viewport.scaleFactor;
    console.log('scaleFactor', ((1 + (1 - scaleFactor)) * 100).toFixed(0), '%', scaleFactor);
    // Clear the canvas and allow a redraw
    clear(ctx, viewport.dimensions);
    options.render?.(viewport);
  };

  // Observe the resize of the canvas and set a resizeObserver to reset
  // canvas dimension and redraw
  new ResizeObserver(resizeObserver(canvas, draw)) // Resizing callback on canvas and capable of draw()
    .observe(canvasContainerEl!, { box: 'content-box' }); // Observe the parent element of the canvas

  // Track the wheel event with a zoom Observer
  canvas.addEventListener(
    'wheel',
    zoomObserver((z) => {
      zoom = z;
      draw();
    }, zoom)
  );

  // Track mouse-down mouse-move mouse-up with a panObserver
  mousePanObserver(canvas, pan, (prevPan, dx, dy) => {
    pan = [prevPan[0] + dx * scaleFactor, prevPan[1] + dy * scaleFactor];
    draw();
    return pan;
  });

  draw();
};

interface CanvasProps {
  id: string;
  zoom?: number; // Optional zoom level, defaults to canvas width / 2
  class?: string; // Optional CSS class for the container
  children: JSX.Element; // Children can be any valid SolidJS component or element
}

export const Canvas: Component<CanvasProps> = (props: CanvasProps) => {
  const [viewport, setViewport] = createSignal<Viewport>();
  onMount(() => {
    const options: Partial<Options> = {
      pan: [0.0, 0.0],
      render: setViewport,
    };
    if (props.zoom !== undefined) {
      options.zoom = props.zoom;
    }
    initCanvas(props.id, options);
  });

  const context = { vp: viewport };
  return (
    <canvasContext.Provider value={context}>
      <div
        class={props.class ?? 'overflow-hidden'}
        id={`${props.id}-container`}
        style="width: 100%; height: 100%;"
      >
        <canvas id={props.id} style="display: block;"></canvas>
        {props.children}
      </div>
    </canvasContext.Provider>
  );
};
