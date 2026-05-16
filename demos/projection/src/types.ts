import type { Point } from '@micurs/ts-geopro';

export type Polygon = Point[];

export type PolyShape = {
  vertices: Point[];
  edges: [number, number][];
  faces: number[][];
};

export type Context3D = {
  ctx: CanvasRenderingContext2D;
  projection: (p: Point) => Point;
  width: number;
  height: number;
  dpr: number;
};
