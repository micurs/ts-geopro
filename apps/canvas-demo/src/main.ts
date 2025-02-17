import './style.css';
import { init } from './ts-geopro-canvas/init.ts';
import type { GPCanvas } from './ts-geopro-canvas/types.ts';

try {
  const render = init('app-canvas');

  render((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'red';
    ctx.fillRect(-1.0, -1.0, 1.0, 1.0);
  });
  render((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'green';
    ctx.fillRect(0.0, 0.0, 1.0, 1.0);
  });
} catch (e) {
  alert(`Error initializing the canvas: ${(e as Error).message} )`);
}
