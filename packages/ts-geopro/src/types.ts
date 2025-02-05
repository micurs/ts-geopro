import { vec2 } from "gl-matrix";
import type { Rotation, Vector } from './index.ts';

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