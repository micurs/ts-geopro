import './style.css';

import { Frame, Point, Vector, Transform, deg2rad, map, absolute, Ray } from '@micurs/ts-geopro';
import { init } from './ts-geopro-canvas/init.ts';
import type { Viewport } from './ts-geopro-canvas/types.ts';
import { drawFrame, drawPoint, drawRay } from './ts-geopro-canvas/geo-draw.ts';

try {
  const [draw, render] = init('app-canvas');

  const frameTransf = Transform.fromRotationZ(deg2rad(0.3));
  const relPointTransf = Transform.fromRotationZ(deg2rad(-0.6));
  let relEntities = [
    Point.from(0.5, 0.6, 0),
    Point.from(-0.5, 0.8, 0),
    Point.from(1.5, -0.8, 0),
    Point.from(-1.2, -0.2, 0),
    Point.from(+0.9, +1.1, 0),
    Point.from(-0.9, -0.3, 0),
  ];
  let frame = Frame.from2Vectors(
    Point.from(-0.2, 0.6, 0), // origin
    Vector.from(0, 0, 1), // z
    Vector.from(1, 0, 0)
  );

  let rays = [Ray.from(Point.from(-2, 2, 0), Vector.from(-1, 1, 0))];

  let absEntities = relEntities.map((rp) => rp.absolute(frame));
  const rotateFrame = map(frameTransf);
  const rotatePoint = map(relPointTransf);

  render((vp: Viewport) => {
    drawFrame(vp)(frame);
  });

  render((vp: Viewport) => {
    const drawP = drawPoint(vp);
    const drawR = drawRay(vp);
    absEntities.forEach(drawP);
    rays.forEach(drawR);
  });

  setInterval(() => {
    frame = rotateFrame(frame);
    const frameToWorld = absolute(frame);
    relEntities = relEntities.map(rotatePoint);
    absEntities = relEntities.map(frameToWorld);
    rays = rays.map(rotateFrame);
    draw();
  }, 1000 / 60);
} catch (e) {
  alert(`Error initializing the canvas: ${(e as Error).message} )`);
}
