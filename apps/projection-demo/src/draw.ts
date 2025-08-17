import { UnitVector, Vector, Point, Transform, map } from '@micurs/ts-geopro';
import type { Context3D, Polygon, PolyShape } from './types.ts';

export const polygonCenter = (poly: Polygon): Point => {
  const n = poly.length;
  let sx = 0,
    sy = 0,
    sz = 0;
  for (const p of poly) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  return Point.fromValues(sx / n, sy / n, sz / n);
};

export const faceNormalOutward = (...polyWorld: Polygon): [UnitVector, Point] => {
  const p0 = polyWorld[0];
  const p1 = polyWorld[1];
  const p2 = polyWorld[2];
  const e1 = Vector.fromPoints(p1, p0); // p1 - p0
  const e2 = Vector.fromPoints(p2, p0); // p2 - p0
  let normal = UnitVector.crossProduct(e1, e2); // raw normal
  // Ensure normal points outward with respect to object center (assumed near origin)
  const c = polygonCenter(polyWorld);
  const toCenter = UnitVector.fromPoints(Point.origin(), c); // toward object center
  normal.dot(toCenter); // dot product to check direction
  if (normal.dot(toCenter) > 0) {
    normal = normal.invert();
  }
  return [normal, c]; // return normal and center
};

/**
 * Draw a line between two points in 3D coordinates.
 * @param ctx - Canvas rendering context
 * @param pts -  the 3D point array
 * @param color - Color of the line
 */
export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  color: string,
  fillColor: string,
  thick: number,
  ...pts: Polygon
) => {
  const [ppStart, ...ppRest] = pts;
  // Scale line width inversely to the average scale factor to maintain consistent thickness
  ctx.fillStyle = fillColor;
  ctx.lineWidth = thick * 2;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ppStart.x, ppStart.y);
  ppRest.forEach((pp) => ctx.lineTo(pp.x, pp.y));
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
};

export const drawShape = (context3D: Context3D, shape: PolyShape, eye: Point) => {
  const { vertices: tVtx, faces } = shape;
  context3D.ctx.strokeStyle = '#fff';
  const pVtx = tVtx.map(context3D.projection);

  // Draw faces
  const thick = 2 / Math.min(context3D.width, context3D.height);

  faces.forEach((face) => {
    // Compute backface culling
    const [n, c] = faceNormalOutward(tVtx[face[0]], tVtx[face[1]], tVtx[face[2]], tVtx[face[3]]);
    const toEye = UnitVector.fromPoints(eye, c);
    const d = n.dot(toEye);
    if (d > 0) {
      drawPolygon(
        context3D.ctx,
        'white',
        `rgba(${150 * d},${150 * d},${150 * d}, 0.6)`,
        thick,
        pVtx[face[0]],
        pVtx[face[1]],
        pVtx[face[2]],
        pVtx[face[3]]
      ); // Bottom
    }
  });
};

/**
 * Draw a line between two points in 3D coordinates.
 * @param p1 -  a 3D point
 * @param p2 - another 3D point
 * @param color - Color of the line
 */
function drawLine(context3D: Context3D, p1: Point, p2: Point, color: string) {
  const { ctx, projection, width, height } = context3D;
  const pp1 = projection(p1);
  const pp2 = projection(p2);

  // Scale line width inversely to the average scale factor to maintain consistent thickness
  ctx.lineWidth = 1 / Math.min(width, height);
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(pp1.x, pp1.y);
  ctx.lineTo(pp2.x, pp2.y);
  ctx.strokeStyle = color;
  ctx.stroke();
}

export const drawWorldFrame = (context3D: Context3D) => {
  drawLine(context3D, Point.origin(), Point.from(1, 0, 0), '#f00');
  drawLine(context3D, Point.origin(), Point.from(0, 1, 0), '#0f0');
  drawLine(context3D, Point.origin(), Point.from(0, 0, 1), '#00f');
};

export const drawGrid = (context3D: Context3D) => {
  const d = 20;
  const d2 = d / 2;
  const step = 1.0;
  for (let i = -d2; i <= d2; i += step) {
    drawLine(context3D, Point.from(i, -d2, 0), Point.from(i, d2, 0), '#666');
    drawLine(context3D, Point.from(-d2, i, 0), Point.from(d2, i, 0), '#666');
  }
};
