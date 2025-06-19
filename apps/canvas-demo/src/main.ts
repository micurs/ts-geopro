import './style.css';

import { init } from './ts-geopro-canvas/init.ts';
import { buildScene } from './buildScene.ts';
import { renderScene } from './ts-geopro-canvas/render.ts';

try {
  const posPanel = document.getElementById('app-zoom');
  const [update, render] = init('app-canvas', {
    zoom: 20,
    centerCoord: [0, 0],
    position: (centerPoint, zoom) => {
      posPanel!.innerHTML = `Zoom: ${zoom.toFixed(2)} Center: (${centerPoint[0].toFixed(2)}, ${centerPoint[1].toFixed(2)})`;
    },
  });

  const myScene = buildScene();
  // Rendering function
  render(renderScene(myScene));

  // Update function
  update(() => {});
} catch (e) {
  alert(`Error initializing the canvas: ${(e as Error).message} )`);
}
