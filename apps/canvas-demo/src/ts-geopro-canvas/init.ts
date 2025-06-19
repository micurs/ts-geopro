import { getViewport } from './viewport.ts';
import { renderPerfectGrid } from './perfect-grid.ts';
import type { RenderFn, Size2D, Coord2D, InitOptions, Renderer, UpdaterFn, Updater } from './types.ts';
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

interface Options {
  zoom: number;
  centerCoord: Coord2D;
  position?: (centerPoint: Coord2D, zoom: number) => void;
}

/**
 *
 * @param canvasElName - the id of the canvas element
 * @param renderer a render function
 * @returns
 */
export const init = (canvasElName: string, options: Partial<Options> = {}): [Updater, Renderer] => {
  let renderingFn: RenderFn | null = null;
  let updaterFn: UpdaterFn | null = null;
  let zoom = options.zoom ?? 10.0;
  let centerPoint: Coord2D = options.centerCoord ?? [0.0, 0.0];
  let scaleFactor = 2;
  const canvas: HTMLCanvasElement = getCanvas(canvasElName);
  const ctx = getContext(canvas);
  const canvasCont = canvas?.parentElement;

  // Main drawing function.
  const draw = () => {
    const viewport = setup({ canvas, ctx, zoom, pan: centerPoint });
    scaleFactor = viewport.scaleFactor;
    clear(ctx, viewport.dimensions);
    renderPerfectGrid(ctx, viewport);
    updaterFn && updaterFn(performance.now());
    renderingFn && renderingFn(viewport);
    requestAnimationFrame(draw);
  };

  // Observe the resize of the canvas and set a resizeObserver to reset
  // canvas dimension and redraw
  new ResizeObserver(resizeObserver(canvas, draw)) // Resizing callback on canvas and capable of draw()
    .observe(canvasCont!, { box: 'device-pixel-content-box' }); // Observe the parent element of the canvas

  // Track the wheel event with a zoom Observer
  canvas.addEventListener(
    'wheel',
    zoomObserver((z) => {
      zoom = z;
      options.position?.(centerPoint, zoom);
    }, zoom)
  );

  // Track mouse-down mouse-move mouse-up with a panObserver
  mousePanObserver(canvas, centerPoint, (prevPan, dx, dy) => {
    centerPoint = [prevPan[0] + dx * scaleFactor, prevPan[1] + dy * scaleFactor];
    options.position?.(centerPoint, zoom);
    return centerPoint;
  });

  draw();

  // return the function that can be used to add and remove
  // renderers to the render list.
  return [
    (updater: UpdaterFn) => {
      updaterFn = updater;
    },
    (renderer: RenderFn) => {
      renderingFn = renderer;
    },
  ];
};
