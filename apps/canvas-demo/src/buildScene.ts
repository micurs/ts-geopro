import { Point, Vector, Ray, Frame } from '@micurs/ts-geopro';

import { addEntity, createScene } from './ts-geopro-canvas/scene.ts';
import type { Scene } from './ts-geopro-canvas/types.ts';

export const buildScene = (): Scene => {
  const dx = 5;
  const dy = 5;

  const scene = createScene();
  const frame = Frame.from2Vectors(
    Point.from(-2.2, 1.9, 0), // origin
    Vector.from(0, 0, 1), // z
    Vector.from(1, 0, 0)
  );

  Array.from({ length: 20 }, () =>
    Ray.from(
      Point.from(Math.random() * dx * 2 - dx, Math.random() * dy * 2 - dy, 0), // origin
      Vector.from(Math.random() * 2 - 1, Math.random() * 2 - 1, 0) // direction
    )
  ).forEach((r) => addEntity(scene, { type: 'ray', ray: r, frame }));

  return scene;
};
