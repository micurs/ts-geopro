// Main exports for @micurs/ts-geosolid-canvas

// Canvas component
export { Canvas } from './canvas.tsx';
export {
  buildCanvasComponent,
  type CanvasDrawFn,
} from './build-canvas-component.tsx';

// Shape components
export { Line, type LineProps } from './line.tsx';
export { PerfectGrid, type PerfectGridProps } from './perfect-grid.tsx';
export { Ellipse, type EllipseProps } from './ellipse.tsx';
export { Rectangle, type RectangleProps } from './rectangle.tsx';

export const version = '0.1.0';
