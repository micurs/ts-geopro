import { Frame } from "./frame.ts";
import { Point } from "./point.ts";
import { Transform } from "./transform.ts";
import { UnitVector } from "./unit-vector.ts";
import { Vector } from "./vector.ts";

export type Mappable = Vector | Point | UnitVector;

export const isFrame = (d: unknown): d is Frame => {
  return d && (d as Frame).isFrame !== undefined ? (d as Frame).isFrame() : false;
};

export const map = (t: Transform | Frame) => (o: Mappable) => {
  return o.map(t);
};

export type Composable = Frame | Transform;

/**
 * Compose multiple transformations into a single transformation
 * @param t - a list of GeoMap transformation objects to compose
 * @returns a single GeoMap object that is the composition of all the input GeoMap objects
 */
export function composeTransformations(...t: Array<Transform>): Transform {
  const [h, ...rest] = t;
  return rest.reduce((accTrans, trans) => accTrans.compose(trans), h!);
}

/**
 * Compose multiple frames into a single frame
 * @param t - a list of GeoMap transformation objects to compose
 * @returns a single GeoMap object that is the composition of all the input GeoMap objects
 */
export function composeFrames(...t: Array<Frame>): Frame {
  const [h, ...rest] = t;
  return rest.reduce((accTrans, trans) => accTrans.compose(trans), h!);
};



