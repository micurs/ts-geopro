import { createSignal, onMount } from "solid-js";
import { render } from "solid-js/web";
import {
  Canvas,
  Ellipse,
  Line,
  PerfectGrid,
  Rectangle,
  Rotation2D,
} from "../src/index.ts";
import { Point } from "@micurs/ts-geopro";

const App = () => {
  const [angle1, setAngle1] = createSignal(0);
  const [angle2, setAngle2] = createSignal(0);

  onMount(() => {
    setInterval(() => {
      setAngle1((angle) => angle + 0.01);
    }, 1000 / 25);
    setInterval(() => {
      setAngle2((angle) => angle - 0.01);
    }, 1000 / 40);
  });

  return (
    <Canvas
      id="demo-canvas"
      zoom={400}
      class="w-full h-full"
    >
      {/* Grid background */}
      <PerfectGrid
        showOrigin
        alpha={0.5}
        steps={10}
      />

      <Line
        from={Point.from(-100, 150, 0)}
        to={Point.from(100, 50, 0)}
        color="#00ff00"
        width={1}
        end="arrow"
        endSize={3}
        endStyle="filled"
      />

      {/* Line with empty arrows at both ends */}
      <Line
        from={Point.from(-150, -50, 0)}
        to={Point.from(-150, 100, 0)}
        color="#ff6600"
        width={2}
        start="arrow"
        end="arrow"
        startSize={3}
        endSize={3}
        startStyle="empty"
        endStyle="empty"
      />

      {/* Line with custom arrow colors and different sizes */}
      <Line
        from={Point.from(150, 100, 0)}
        to={Point.from(150, -50, 0)}
        color="#ffffff"
        width={2}
        end="arrow"
        endSize={12}
        endStyle="filled"
        endColor="#ff0000"
      />

      {/* Line with circle at start and arrow at end */}
      <Rotation2D angle={angle1()} center={Point.from(-50, 150, 0)}>
        <Line
          from={Point.from(-50, 150, 0)}
          to={Point.from(50, 150, 0)}
          color="#20f0ff"
          width={2}
          start="circle"
          end="arrow"
          startSize={2}
          endSize={4}
          startStyle="filled"
          endStyle="filled"
          startColor="#ff2020"
        />
      </Rotation2D>

      {/* Line diagonal - no arrows (default) */}
      <Line
        from={Point.from(-50, -50, 0)}
        to={Point.from(50, 50, 0)}
        color="#ffff00"
        width={1}
      />

      {/* Rotated group - ellipse continuously rotating around origin */}
      <Rotation2D angle={angle1()} center={Point.from(0, 0, 0)}>
        <Ellipse
          center={Point.from(0, 0, 0)}
          width={100}
          height={40}
          color="#ff8800"
          strokeWidth={2}
        />
      </Rotation2D>

      {/* Rotated group with custom center - rectangle oscillating around its corner */}
      <Rotation2D angle={angle2()} center={Point.from(-50, 150, 0)}>
        <Rectangle
          center={Point.from(-50, 150, 0)}
          width={100}
          height={100}
          color="#88ff00"
          strokeWidth={2}
        />
      </Rotation2D>
    </Canvas>
  );
};

const root = document.getElementById("canvas-container");
if (root) {
  render(() => <App />, root);
}
