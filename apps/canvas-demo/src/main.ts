import './style.css';

import { Frame, Point, Vector, Transform, deg2rad, map } from '@micurs/ts-geopro';
import { init } from './ts-geopro-canvas/init.ts';
import type { Viewport } from './ts-geopro-canvas/types.ts';
import { drawFrame, drawPoint } from './ts-geopro-canvas/geo-draw.ts';

try {
  const [draw, render] = init('app-canvas');

  const transform = Transform.fromRotationZ(deg2rad(2));
  let point = Point.from(-1, 1, 0);
  const frame = Frame.from2Vectors(
    Point.from(1, 2, 0), // origin
    Vector.from(0, 0, 1), // z
    Vector.from(1, 0.2, 0)
  );

  render((vp: Viewport) => {
    drawFrame(vp)(frame);
  });

  render((vp: Viewport) => {
    drawPoint(vp)(point);
  });

  setInterval(() => {
    const rot = map(transform);
    point = rot(point) as Point;
    // frame = rot(frame) as Frame;
    console.log(point.toString());
    draw();
  }, 1000 / 60);

  // render((vp: Viewport) => {
  //   const { ctx, pan, scaleFactor } = vp;
  //   ctx.fillStyle = 'yellow';
  //   const w = Math.max(6.0e-7, 4 * scaleFactor);
  //   ctx.beginPath();
  //   ctx.ellipse(-pan[0], -pan[1], w, w, 0, 0, 2 * Math.PI);
  //   ctx.fill();
  // });
} catch (e) {
  alert(`Error initializing the canvas: ${(e as Error).message} )`);
}
