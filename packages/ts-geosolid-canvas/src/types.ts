import { Point } from "@micurs/ts-geopro";

export interface DrawableProps {
  id: string;
}

export interface BoundingBox {
  min: Point;
  max: Point;
}
