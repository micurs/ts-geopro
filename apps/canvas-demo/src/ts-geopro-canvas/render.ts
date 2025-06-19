import { drawFrame, drawPoint, drawRay } from './geo-draw.ts';
import type { Viewport, Scene } from './types.ts';

export const renderScene = (scene: Scene) => (vp: Viewport) => {
  const drawP = drawPoint(vp);
  const drawR = drawRay(vp);
  const drawF = drawFrame(vp);
  scene.entities.forEach((entity) => {
    switch (entity.type) {
      case 'point':
        vp.ctx.fillStyle = 'red';
        drawP(entity.point);
        break;
      case 'ray':
        vp.ctx.fillStyle = 'yellow';
        drawR(entity.ray);
        break;
      case 'frame':
        vp.ctx.fillStyle = 'green';
        drawF(entity.frame);
        break;
    }
  });
};
