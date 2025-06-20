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

export const zoomObserver = (zoom: (z: number) => void, initZoom: number) => {
  let zoomFactor = initZoom;
  return (event: WheelEvent) => {
    const delta = 1 + event.deltaY / 1000;
    zoomFactor *= delta;
    zoomFactor = Math.max(0.000009, zoomFactor);
    zoomFactor = Math.min(10000000, zoomFactor);
    zoom(zoomFactor);
  };
};

export const resizeObserver = (canvas: HTMLCanvasElement, draw: () => void) => (entries: ResizeObserverEntry[]) => {
  const entry = entries[0];
  if (!entry) {
    return;
  }
  const contentBoxSize = entry.contentBoxSize[0];
  if (!contentBoxSize) {
    return;
  }
  if (Math.abs(canvas.width - contentBoxSize.inlineSize) > 1) {
    canvas.width = Math.floor(contentBoxSize.inlineSize); //Math.floor(contentBoxSize.inlineSize - 2);
    canvas.style.width = `${canvas.width}px`;
  }
  if (Math.abs(canvas.height - contentBoxSize.blockSize) > 1) {
    canvas.height = Math.floor(contentBoxSize.blockSize);
    canvas.style.height = `${canvas.height}px`;
  }
  draw();
};

export const mousePanObserver = (
  canvas: HTMLCanvasElement,
  centerPoint: Coord2D,
  cb: (pp: Coord2D, x: number, y: number) => Coord2D
) => {
  let mouseDown = false;
  let x = 0;
  let y = 0;
  let prevPan: Coord2D = centerPoint;
  let pan: Coord2D = centerPoint;
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    x = event.clientX;
    y = event.clientY;
    prevPan = pan;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!mouseDown) {
      return;
    }
    pan = cb(prevPan, event.clientX - x, event.clientY - y);
  });
  canvas.addEventListener('pointerup', (event) => {
    mouseDown = false;
    canvas.releasePointerCapture(event.pointerId);
  });
};
