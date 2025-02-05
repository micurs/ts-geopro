import { Frame } from "./frame.ts";
import { Point } from "./point.ts";
import { Transform } from "./transform.ts";
import { UnitVector } from "./unit-vector.ts";
import { Vector } from "./vector.ts";


export type Mappable = Vector | Point | UnitVector;
export interface GeoMap {
  compose: (t: GeoMap) => GeoMap;
  isFrame: () => boolean;
}

export const isFrame = (d: unknown): d is Frame => {
  return d && (d as Frame).isFrame !== undefined ? (d as Frame).isFrame() : false;
};

export const map = (t: Transform | Frame) => (o: Mappable) => {
  return o.map(t);
};

/**
 * Compose multiple transformations into a single transformation
 * @param t - a list of GeoMap transformation objects to compose
 * @returns a single GeoMap object that is the composition of all the input GeoMap objects
 */
export const compose = (...t: GeoMap[]) => {
  const [h, ...rest] = t;
  return rest.reduce((accTrans, trans) => accTrans.compose(trans), h!);
};



