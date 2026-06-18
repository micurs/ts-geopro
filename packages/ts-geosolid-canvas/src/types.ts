import { Point, Vector } from "@micurs/ts-geopro";

export interface DrawableProps {
  id: string;
  editable?: boolean;
}

export interface BoundingBox {
  min: Point;
  max: Point;
}

export type InteractiveScaling = {
  active: false;
} | {
  active: true;
  shiftActive: boolean;
  pivot: Point;
  localCorner: Vector;
  center: Point;
  centerPivot: Point;
  centerLocalCorner: Vector;
  box: BoundingBox;
  capturedMouseScreen: Point;
  capturedScale: Vector;
};

/** State for handle-interaction drag operations (line, rectangle, ellipse). */
export interface DragState {
  index: number;
  startWorld: Point | null;
  startScreen: Point | null;
  hoveredIndex: number;
}
