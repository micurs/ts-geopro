import { Frame } from "./frame.ts";
import { Point } from "./point.ts";
import { Transform } from "./transform.ts";
import { UnitVector } from "./unit-vector.ts";
import { Vector } from "./vector.ts";


export type Mappable = Vector | Point | UnitVector;
export type GeoMap = Transform | Frame;

export const map = (t: GeoMap) => (o: Mappable) => {
  return o.map(t);
}

export const compose = (...t: GeoMap[]) => {
  const [h, ...rest] = t;
  return rest.reduce<GeoMap>((accTrans, trans) => accTrans.compose(trans), h!);
}



