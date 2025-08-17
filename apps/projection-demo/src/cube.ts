import { Point } from '@micurs/ts-geopro';
import type { PolyShape } from './types.ts';

const cubeVertices = [
  Point.from(-1, -1, -1),
  Point.from(1, -1, -1),
  Point.from(1, 1, -1),
  Point.from(-1, 1, -1),
  Point.from(-1, -1, 1),
  Point.from(1, -1, 1),
  Point.from(1, 1, 1),
  Point.from(-1, 1, 1),
];

const cubeEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as [number, number][];

const cubeFaces = [
  [0, 1, 2, 3], // Bottom
  [4, 5, 6, 7], // Top
  [0, 1, 5, 4], // Front
  [2, 3, 7, 6], // Back
  [0, 3, 7, 4], // Left
  [1, 2, 6, 5], // Right
];

export const cube: PolyShape = {
  vertices: cubeVertices,
  edges: cubeEdges,
  faces: cubeFaces,
};
