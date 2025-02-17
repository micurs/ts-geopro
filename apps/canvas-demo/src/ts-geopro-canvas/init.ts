import { getViewport } from './viewport.ts';
import { renderGrid } from './perfect-grid.ts';
import type { RenderFn } from './types.ts';

const clear = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
};

const getCanvas = (canvasElName: string) => {
  const canvas: HTMLCanvasElement = document.getElementById(canvasElName) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`${canvasElName} could not be found.`);
  }
  return canvas;
};

const getContext = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get the 2D context our of this canvas !?!');
  }
  return ctx;
};

export type RenderingContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zoom: number;
};

const rendering = (context: RenderingContext, renderingFns: Set<RenderFn>) => {
  const { ctx, zoom, canvas } = context;
  const [width, height] = [canvas.clientWidth, canvas.clientHeight];
  const viewport = getViewport(width, height, zoom);
  clear(ctx, width, height);

  ctx.reset();

  ctx.transform(
    viewport.transform.direct(0, 0),
    viewport.transform.direct(1, 0),
    viewport.transform.direct(0, 1),
    viewport.transform.direct(1, 1),
    viewport.transform.direct(3, 0),
    viewport.transform.direct(3, 1)
  );
  renderGrid(ctx, viewport);
  renderingFns.forEach((fn) => fn(ctx));
};

const zoomObserver = (draw: (z: number) => void, initZoom: number) => {
  let zoom = initZoom;
  return (event: WheelEvent) => {
    const delta = 1 + event.deltaY / 1000;
    zoom *= delta;
    zoom = Math.max(0.00001, zoom);
    zoom = Math.min(10000000, zoom);
    draw(zoom);
  };
};

const resizeObserver = (draw: () => void, canvas: HTMLCanvasElement) => (entries: ResizeObserverEntry[]) => {
  const entry = entries[0];
  if (!entry) {
    return;
  }
  const contentBoxSize = entry.contentBoxSize[0];
  if (!contentBoxSize) {
    return;
  }
  if (canvas.width !== Math.floor(contentBoxSize.inlineSize)) {
    canvas.width = Math.floor(contentBoxSize.inlineSize);
  }
  if (canvas.height !== Math.floor(contentBoxSize.blockSize)) {
    canvas.height = Math.floor(contentBoxSize.blockSize);
  }
  draw();
};

/**
 *
 * @param canvasElName - the id of the canvas element
 * @param renderer a render function
 * @returns
 */
export const init = (canvasElName: string): ((renderer: RenderFn) => void) => {
  const renderingFns = new Set<RenderFn>();
  let zoom = 2.0;
  const canvas: HTMLCanvasElement = getCanvas(canvasElName);
  const ctx = getContext(canvas);

  const draw = (newZoom?: number) => {
    zoom = newZoom ?? zoom;
    rendering({ canvas, ctx, zoom }, renderingFns);
    // globalThis.requestAnimationFrame(draw);
  };
  draw(zoom);

  new ResizeObserver(resizeObserver(draw, canvas)).observe(canvas);
  // observer.observe(canvas);
  canvas.addEventListener('wheel', zoomObserver(draw, zoom));

  return (renderer: RenderFn) => renderingFns.add(renderer);
};
