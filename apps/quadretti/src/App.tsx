import type { Component } from 'solid-js';
import { Canvas } from './canvas.tsx';
import { Line } from './line.tsx';
import { Rectangle } from './rectangle.tsx';
import { Ellipse } from './ellipse.tsx';
import { PerfectGrid } from './perfect-grid.tsx';
import { Point } from '@micurs/ts-geopro';

const App: Component = () => {
  return (
    <Canvas id='quadretti'>
      <PerfectGrid
        showOrigin={true}
        alpha={0.5}
        steps={10}
      />
      <Line
        from={Point.from(-50, 50, 0)}
        to={Point.from(50, -50, 0)}
        color='red'
        width={1}
      />
      <Line
        from={Point.from(50, 50, 0)}
        to={Point.from(-50, -50, 0)}
        color='yellow'
        width={1}
      />
      <Rectangle
        topLeft={Point.from(-60, 80, 0)}
        width={190}
        height={100}
        color='lightgray'
        strokeWidth={1}
        fill='rgba(200, 200, 200, 0.4)'
      />
      <Ellipse
        center={Point.from(0, -30, 0)}
        width={50}
        height={35}
        color='green'
        strokeWidth={1}
        fill='rgba(100, 250, 120, 0.8)'
      />
    </Canvas>
  );
};

export default App;
