import { render } from 'solid-js/web';
import { Canvas, PerfectGrid, Line, Ellipse, Rectangle } from '../src/index.ts';
import { Point } from '@micurs/ts-geopro';

const App = () => {
  return (
    <Canvas
      id='demo-canvas'
      zoom={400}
      class='w-full h-full'
    >
      {/* Grid background */}
      <PerfectGrid
        showOrigin={true}
        alpha={0.5}
        steps={10}
      />

      {/* Line with filled end arrow */}
      <Line
        from={Point.from(-100, 150, 0)}
        to={Point.from(100, 50, 0)}
        color='#00ff00'
        width={1}
        endArrow='arrow'
        arrowSize={8}
        arrowFilled={true}
      />

      {/* Line with stroked arrows at both ends */}
      <Line
        from={Point.from(-150, -50, 0)}
        to={Point.from(-150, 100, 0)}
        color='#ff6600'
        width={2}
        startArrow='arrow'
        endArrow='arrow'
        arrowSize={6}
        arrowFilled={false}
      />

      {/* Line with custom arrow color */}
      <Line
        from={Point.from(150, 100, 0)}
        to={Point.from(150, -50, 0)}
        color='#ffffff'
        width={2}
        endArrow='arrow'
        arrowSize={10}
        arrowFilled={true}
        arrowColor='#ff0000'
      />

      {/* Ellipse at origin */}
      <Ellipse
        center={Point.from(0, 0, 0)}
        width={80}
        height={120}
        color='#00ffff'
        strokeWidth={2}
        fill='rgba(0, 255, 255, 0.1)'
      />

      {/* Rectangle in upper right */}
      <Rectangle
        topLeft={Point.from(20, 40, 0)}
        width={60}
        height={40}
        color='#ff00ff'
        strokeWidth={2}
        fill='rgba(255, 0, 255, 0.1)'
      />

      {/* Line diagonal - no arrows (default) */}
      <Line
        from={Point.from(-50, -50, 0)}
        to={Point.from(50, 50, 0)}
        color='#ffff00'
        width={1}
      />
    </Canvas>
  );
};

const root = document.getElementById('canvas-container');
if (root) {
  render(() => <App />, root);
}
