import { vec2, type ReadonlyMat4 } from 'gl-matrix';
import type { Rotation, Vector, Frame, Point, UnitVector, Transform, Ray } from './index.ts';

export type Elem<T> = T extends (infer U)[] ? U : never;

export interface Ray2D {
  origin: vec2;
  direction: vec2;
}

export type VecEntries = [number, number, number, number];

export type MatEntries = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

export interface RotationTranslationScale {
  rotation?: Rotation;
  translation?: Vector;
  scale?: Vector;
}

/**
 * Possible row index of a Matrix
 * @public
 */
export type Row = 0 | 1 | 2 | 3;

/**
 * Possible column index of a Matrix
 * @public
 */
export type Col = 0 | 1 | 2 | 3;

/**
 * Homogenous coordinates for transformable points or vector
 * @public
 */
export type HCoords = [number, number, number, number];

/**
 * Note: each HCoords is a column in the matrix
 * @public
 */
export type Matrix = [HCoords, HCoords, HCoords, HCoords];

/**
 * A transformation object must implement this interface
 * @public
 */
export interface GeoMatrix {
  readonly directMatrix: ReadonlyMat4;
  readonly inverseMatrix: ReadonlyMat4;
  direct(row: Row, col: Col): number;
  compose(t: GeoMatrix): GeoMatrix;
}

/**
 * A transformable object must implement this interface
 * @public
 */
export interface HomogeneousCoords {
  coordinates: HCoords;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Addable {
  add(a: Addable): Addable;
}

/**
 * An invertible transformation object must implement this interface
 * @public
 */
export interface InvertibleGroMatrix {
  readonly inverseMatrix: ReadonlyMat4;
  inverse(row: Row, col: Col): number;
  invert(): InvertibleGroMatrix;
}

/**
 * Invertible transformation (affine transformation only)
 * @public
 */
export type AffineGeoMatrix = GeoMatrix & InvertibleGroMatrix;

export type GeoEntity<T> = {
  absolute: (frame: Frame) => T;
  relative: (frame: Frame) => T;
  map: (t: Transform) => T;
  unMap: (t: Transform) => T;
};

export type GeoEntities = Point | Vector | Frame | UnitVector | Ray;
