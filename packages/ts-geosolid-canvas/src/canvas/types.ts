import type { Point, Transform, Frame, Ray } from '@micurs/ts-geopro';

export type PointMapper = (p: Point) => Point;

export type Coord2D = [number, number];

export type Size2D = [number, number];

export interface Viewport {
  ctx: CanvasRenderingContext2D;
  scaleFactor: number;
  trans: [number, number];
  transform: Transform;
  dimensions: [number, number];
  pan: [number, number];
}

export interface GPCanvas {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
}

export type ViewportSettings = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zoom: number;
  pan: Coord2D;
  dim: Size2D;
};

export type RenderFn = (viewport: Viewport) => void;

export type UpdaterFn = (time: number) => void;

export interface Camera {
  transformation: Transform;
}

export type PolylineCoords = Point[];
export type Polyline = Point[];
export type Lines = [Point, Point][];

export type Renderer = (renderer: RenderFn) => void;

export type Updater = (updater: UpdaterFn) => void;

export type RenderableType = Point | Ray | Frame;

interface RenderableEntity {
  frame: Frame;
}
export interface RenderablePoint extends RenderableEntity {
  type: 'point';
  point: Point;
}
export interface RenderableRay extends RenderableEntity {
  type: 'ray';
  ray: Ray;
}
export interface RenderableFrame extends RenderableEntity {
  type: 'frame';
  frame: Frame;
}

export type Renderable = RenderablePoint | RenderableRay | RenderableFrame;

export type Scene = {
  entities: Renderable[];
};

export interface Options {
  zoom: number;
  pan: Coord2D;
  render?: (vp: Viewport) => void;
}
