import { getViewport } from './viewport.ts';
import { renderPerfectGrid } from './perfect-grid.ts';
import type { RenderFn, Size2D, Coord2D, InitOptions, Renderer } from './types.ts';
import { getCanvas, getContext, mousePanObserver, resizeObserver, zoomObserver } from './utils.ts';

const clear = (ctx: CanvasRenderingContext2D, [width, height]: [number, number]) => {
  ctx.clearRect(0, 0, width, height);
};

/**
 * Setup transformations, and create a Viewport.
 * @param options = the Rendering context with the info needed to setup the view.
 * @returns the Viewport describing the current view and transformation.
 */
const setup = (options: InitOptions) => {
  const { ctx, zoom, canvas, pan } = options;
  const dim: Size2D = [canvas.clientWidth, canvas.clientHeight];
  const viewport = getViewport(ctx, dim, zoom, pan);

  ctx.reset();
  ctx.setTransform(
    viewport.transform.direct(0, 0), // 2D Rotations and Scale
    viewport.transform.direct(1, 0),
    viewport.transform.direct(0, 1),
    -viewport.transform.direct(1, 1), // Invert the Y direction
    viewport.transform.direct(3, 0), // Translation Components
    viewport.transform.direct(3, 1)
  );
  return viewport;
};

/**
 *
 * @param canvasElName - the id of the canvas element
 * @param renderer a render function
 * @returns
 */
export const init = (canvasElName: string): [() => void, Renderer] => {
  const renderingFns = new Set<RenderFn>();
  let zoom = 10.0;
  let pan: Coord2D = [0.0, 0.0];
  let scaleFactor = 1;
  const canvas: HTMLCanvasElement = getCanvas(canvasElName);
  const ctx = getContext(canvas);

  // Main drawing function.
  const draw = (newZoom?: number) => {
    zoom = newZoom ?? zoom;
    const viewport = setup({ canvas, ctx, zoom, pan });
    clear(ctx, viewport.dimensions);
    renderPerfectGrid(ctx, viewport);
    renderingFns.forEach((fn) => fn(viewport));
    scaleFactor = viewport.scaleFactor;
  };

  // Observe the resize of the canvas and set a resizeObserver to reset
  // canvas dimension and redraw
  new ResizeObserver(resizeObserver(draw, canvas)).observe(canvas);

  // Track the wheel event with a zoom Observer
  canvas.addEventListener('wheel', zoomObserver(draw, zoom));

  // Track mouse-down mouse-move mouse-up with a panObserver
  mousePanObserver(canvas, (prevPan, dx, dy) => {
    pan = [prevPan[0] + dx * scaleFactor, prevPan[1] + dy * scaleFactor];
    draw();
    return pan;
  });

  draw(zoom);

  // return the function that can be used to add and remove
  // renderers to the render list.
  return [
    draw,
    (renderer: RenderFn) => {
      renderingFns.add(renderer);
      return () => {
        renderingFns.delete(renderer);
      };
    },
  ];
};
