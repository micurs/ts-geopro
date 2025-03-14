import './style.css';

import { Frame, Point, Vector, Transform, deg2rad, map, absolute, Ray } from '@micurs/ts-geopro';
import { init } from './ts-geopro-canvas/init.ts';
import type { Viewport } from './ts-geopro-canvas/types.ts';
import { drawFrame, drawLine, drawPoint, drawRay } from './ts-geopro-canvas/geo-draw.ts';

try {
  const [update, render] = init('app-canvas', {
    zoom: 20,
    centerCoord: [0, 0],
  });
  const dx = 1;
  const dy = 1;
  const frameTransf = Transform.fromRotationZ(deg2rad(0.35));
  const relPointTransf = Transform.fromRotationZ(deg2rad(0.0));
  const relRayTransf = Transform.fromRotationZ(deg2rad(-0.3));
  let relEntities = Array.from({ length: 1 }, () => Point.from(Math.random() * dx * 2 - dx, Math.random() * dy * 2 - dy, 0));
  let frame = Frame.from2Vectors(
    Point.from(-2.2, 1.9, 0), // origin
    Vector.from(0, 0, 1), // z
    Vector.from(1, 0, 0)
  );

  let rays = Array.from({ length: 4 }, () =>
    Ray.from(
      Point.from(Math.random() * dx * 2 - dx, Math.random() * dy * 2 - dy, 0), // origin
      Vector.from(Math.random() * 2 - 1, Math.random() * 2 - 1, 0) // direction
    )
  );

  let absEntities = relEntities.map((rp) => rp.absolute(frame));
  const rotateFrame = map(frameTransf);
  const rotatePoint = map(relPointTransf);
  const rotateRay = map(relRayTransf);
  let rayPoints = rays.flatMap((r) => r.on(-1));

  // Rendering function
  render((vp: Viewport) => {
    const drawP = drawPoint(vp);
    const drawR = drawRay(vp);
    vp.ctx.fillStyle = 'red';
    absEntities.forEach(drawP);
    vp.ctx.fillStyle = 'yellow';
    rayPoints.forEach(drawP);

    vp.ctx.strokeStyle = 'blue';
    vp.ctx.setLineDash([10 * vp.scaleFactor, 5 * vp.scaleFactor]);
    rayPoints.forEach((p, i) => {
      vp.ctx.strokeStyle = `rgba(${100 + i},${100 + i},${100 + i}, 0.04)`;
      drawLine(vp)(absEntities[i % absEntities.length]!, p);
    });
    vp.ctx.setLineDash([]);
    rays.forEach(drawR);
    drawFrame(vp)(frame);
  });

  // Update function
  update(() => {
    // Transform the frame and the points
    frame = rotateFrame(frame);
    // Transformation to compute absolute coordinates for Frame relative entities
    const frameToWorld = absolute(frame);

    // Rotate the relative points and convert them to absolute coordinates
    relEntities = relEntities.map(rotatePoint);
    absEntities = relEntities.map(frameToWorld);

    rayPoints = rays.flatMap((r) => absEntities.map((p) => r.project(p)));
    rays = rays.map(rotateRay);
  });
} catch (e) {
  alert(`Error initializing the canvas: ${(e as Error).message} )`);
}
