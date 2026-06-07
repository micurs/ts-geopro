import { Point } from "@micurs/ts-geopro";

export interface DrawableProps {
  id: string;
  editable?: boolean;
}

export interface BoundingBox {
  min: Point;
  max: Point;
}

/** State for handle-interaction drag operations (line, rectangle, ellipse). */
export interface DragState {
  index: number;
  startWorld: Point | null;
  startScreen: Point | null;
  hoveredIndex: number;
}
