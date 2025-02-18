import type { Coord2D } from './types.ts';

export const getCanvas = (canvasElName: string) => {
  const canvas: HTMLCanvasElement = document.getElementById(canvasElName) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`${canvasElName} could not be found.`);
  }
  return canvas;
};

export const getContext = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get the 2D context our of this canvas !?!');
  }
  return ctx;
};

export const zoomObserver = (draw: (z: number) => void, initZoom: number) => {
  let zoom = initZoom;
  return (event: WheelEvent) => {
    const delta = 1 + event.deltaY / 1000;
    zoom *= delta;
    zoom = Math.max(0.000009, zoom);
    zoom = Math.min(10000000, zoom);
    draw(zoom);
  };
};

export const resizeObserver = (draw: () => void, canvas: HTMLCanvasElement) => (entries: ResizeObserverEntry[]) => {
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

export const mousePanObserver = (canvas: HTMLCanvasElement, cb: (pp: Coord2D, x: number, y: number) => Coord2D) => {
  let mouseDown = false;
  let x = 0;
  let y = 0;
  let prevPan: Coord2D = [0, 0];
  let pan: Coord2D = [0, 0];
  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    x = event.clientX;
    y = event.clientY;
    prevPan = pan;
  });
  canvas.addEventListener('mousemove', (event) => {
    if (!mouseDown) {
      return;
    }
    pan = cb(prevPan, event.clientX - x, event.clientY - y);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
  });
};
