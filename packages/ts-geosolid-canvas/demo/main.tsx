import { createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import {
  Canvas,
  Ellipse,
  Line,
  PerfectGrid,
  Rectangle,
  Rotation2D,
  Select2D,
  Translate2D,
} from "../src/index.ts";
import { Point, Vector } from "@micurs/ts-geopro";

const App = () => {
  const [angle1, setAngle1] = createSignal(0);
  const [angle2, setAngle2] = createSignal(0);
  const [tx, setTx] = createSignal(0);
  let dir = 1;

  onMount(() => {
    const id1 = setInterval(() => {
      setAngle1((angle) => angle + 0.04);
    }, 1000 / 60);
    const id2 = setInterval(() => {
      setAngle2((angle) => angle - 0.01);
    }, 1000 / 40);
    const id3 = setInterval(() => {
      setTx((prev) => {
        const next = prev + dir;
        if (next > 100 || next < -100) {
          dir *= -1;
        }
        return next;
      });
    }, 1000 / 30);
    onCleanup(() => {
      clearInterval(id1);
      clearInterval(id2);
      clearInterval(id3);
    });
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

      <Select2D padding={1} color="#fff0ff">
        <Ellipse
          id="demo-ellipse"
          center={Point.from(-80, -80, 0)}
          width={120}
          height={60}
          color="#ff6600"
          strokeWidth={2}
        />
        <Rectangle
          id="demo-rect"
          center={Point.from(25, 40, 0)}
          width={60}
          height={40}
          color="#2266ff"
          strokeWidth={2}
        />
      </Select2D>

      <Select2D padding={1} color="red">
        <Rotation2D angle={angle1()} center={Point.from(90, 50, 0)}>
          <Line
            id="demo-line"
            from={Point.from(90, 50, 0)}
            to={Point.from(140, -50, 0)}
            color="#00ff00"
            width={1}
            end="arrow"
            endSize={3}
            endStyle="filled"
          />
        </Rotation2D>
      </Select2D>

      {/* Line with empty arrows at both ends */}
      <Translate2D vector={Vector.from(tx(), 0, 0)}>
        <Line
          id="demo-line-translate"
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
      </Translate2D>
      {/* Line with circle at start and arrow at end */}
      <Rotation2D angle={angle1()} center={Point.from(-50, 150, 0)}>
        <Line
          id="demo-line-rotate"
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
      {/* Rotated group - ellipse continuously rotating around origin */}
      <Translate2D vector={Vector.from(tx(), -tx(), 0)}>
        <Rotation2D angle={angle1()} center={Point.from(20, 40, 0)}>
          <Ellipse
            id="demo-ellipse-transform"
            center={Point.from(20, 40, 0)}
            width={100}
            height={40}
            color="#ff8800"
            strokeWidth={2}
          />
        </Rotation2D>
      </Translate2D>

      {/* Rotated group with custom center - rectangle oscillating around its corner */}
      <Rotation2D angle={angle2()} center={Point.from(-50, 150, 0)}>
        <Rectangle
          id="demo-rect-rotate"
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
