import { createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import {
  Canvas,
  Ellipse,
  Line,
  PerfectGrid,
  Rectangle,
  RoundedRectangle,
  Select2D,
} from "../src/index.ts";
import { Point, Vector as _Vector } from "@micurs/ts-geopro";

const App = () => {
  const [_angle1, setAngle1] = createSignal(0);
  const [_angle2, setAngle2] = createSignal(0);
  const [_tx, setTx] = createSignal(0);
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

      <Select2D
        padding={4}
        color="#fff0ff"
        snapRotation
        editable
      >
        <Ellipse
          id="demo-ellipse"
          center={Point.from(-50, -50, 0)}
          width={100}
          height={100}
          color="#ff6600"
          strokeWidth={2}
          editable={false}
        />
        <RoundedRectangle
          id="demo-rounded-rect"
          center={Point.from(50, -50, 0)}
          width={100}
          height={100}
          radius={20}
          color="#ff00ff"
          strokeWidth={2}
          editable
        />
        <Rectangle
          id="demo-rect"
          center={Point.from(50, 80, 0)}
          width={100}
          height={40}
          color="#60b0ff"
          strokeWidth={2}
          editable={false}
        />
        <Line
          id="demo-line"
          from={Point.from(-90, 90, 0)}
          to={Point.from(90, -90, 0)}
          color="#00ff00"
          width={1}
          end="arrow"
          endSize={3}
          endStyle="filled"
          editable={false}
        />
      </Select2D>

      {
        /*
      <Select2D
        padding={1}
        color="red"
        handleColor="red"
        handleHighlightColor="yellow"
      >
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

        */
      }
    </Canvas>
  );
};

const root = document.getElementById("canvas-container");
if (root) {
  render(() => <App />, root);
}
