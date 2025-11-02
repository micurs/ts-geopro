// Main exports for @micurs/ts-geosolid-canvas

// Canvas component
export { Canvas } from './canvas.tsx';

// Canvas context and types
export { canvasContext } from './canvas/canvas-context.ts';
export type {
  Viewport,
  Coord2D,
  Size2D,
  Options,
  RoughCanvas,
  ViewportSettings,
  RenderFn,
  GPCanvas,
} from './canvas/types.ts';

// Canvas utilities
export {
  getCanvas,
  getContext,
  getViewport,
  clear,
  resizeObserver,
  zoomObserver,
  mousePanObserver,
  getScaledWidth,
} from './canvas/utils.ts';

export const version = '0.0.1';
