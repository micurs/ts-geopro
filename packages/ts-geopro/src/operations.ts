import type { vec4, vec3 } from 'gl-matrix';
import { Frame } from './frame.ts';
import { Point } from './point.ts';
import { Transform } from './transform.ts';
import type { Addable, GeoMatrix, HomogeneousCoords } from './types.ts';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';

export type Mappable = Vector | Point | UnitVector;

export const isVec4 = (v: unknown): v is vec4 => {
  return (v as vec4)?.length === 4;
};

export const isVec3 = (v: unknown): v is vec3 => {
  return (v as vec4)?.length === 3;
};

export const isFrame = (d: unknown): d is Frame => {
  return d && (d as Frame).isFrame !== undefined ? true : false;
};

export const isVector = (d: unknown): d is Vector => {
  return d && (d as Vector).isVector !== undefined ? true : false;
};

export const isUnitVector = (d: unknown): d is UnitVector => {
  return d && (d as UnitVector).isUnitVector !== undefined ? true : false;
};

export const map =
  (t: GeoMatrix) =>
  (o: HomogeneousCoords): HomogeneousCoords => {
    return o.map(t);
  };

export type Composable = Frame | Transform;

/**
 * Compose multiple frames into a single frame
 * @param t - a list of GeoMap transformation objects to compose
 * @returns a single GeoMap object that is the composition of all the input GeoMap objects
 */
export function compose(...t: Array<Frame>): Frame;
export function compose(...t: Array<Transform>): Transform;
export function compose(...t: Array<GeoMatrix>): GeoMatrix {
  const [h, ...rest] = t;
  return rest.reduce((accTrans: GeoMatrix, trans: GeoMatrix) => {
    return accTrans.compose(trans);
  }, h!);
}

/**
 * Add two vectors or a vector and a point
 * @param v - a vector or a point
 * @param u - a vector
 * @returns a new vector or point
 */
export function add(v: Vector, ...u: Vector[]): Vector;
export function add(v: Point, ...u: Vector[]): Point;
export function add(v: Addable, ...u: Addable[]): Addable {
  const res = u.reduce((acc, curr) => acc.add(curr), v);
  return res;
}
