import { Point, Transform } from '@micurs/ts-geopro';

export type PointMapper = (p: Point) => Point;

export interface Viewport {
  scale: [number, number];
  trans: [number, number];
  transform: Transform;
  dimensions: [number, number];
}

export interface GPCanvas {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
}

export type RenderFn = (ctx: CanvasRenderingContext2D) => void;

export interface Camera {
  transformation: Transform;
}

export type PolylineCoords = Point[];
export type Polyline = Point[];
export type Lines = [Point, Point][];
