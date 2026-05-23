import { createSignal, onMount } from "solid-js";
import type { Component } from "solid-js";
import {
  Canvas,
  Ellipse,
  Line,
  PerfectGrid,
  Rectangle,
  Rotation2D,
} from "@micurs/ts-geosolid-canvas";
import { Point } from "@micurs/ts-geopro";

const App: Component = () => {
  const [rot, setRot] = createSignal(0);

  onMount(() => {
    const start = Date.now();
    setInterval(() => {
      setRot((Date.now() - start) / 1000 * 0.5);
    }, 50);
  });

  return (
    <Canvas id="quadretti">
      <PerfectGrid
        showOrigin={true}
        alpha={0.1}
        steps={10}
      />
      <Line
        from={Point.from(-50, 50, 0)}
        to={Point.from(50, -50, 0)}
        color="red"
        end="arrow"
        endSize={8}
        width={0.1}
      />
      <Line
        from={Point.from(50, 50, 0)}
        to={Point.from(-50, -50, 0)}
        color="yellow"
        end="arrow"
        endSize={8}
        width={1}
      />
      <Rectangle
        center={Point.from(35, 130, 0)}
        width={190}
        height={100}
        color="lightgray"
        strokeWidth={1}
        fill="rgba(200, 200, 200, 0.4)"
      />
      <Ellipse
        center={Point.from(0, -30, 0)}
        width={50}
        height={35}
        color="green"
        strokeWidth={1}
        fill="rgba(100, 250, 120, 0.8)"
      />
      <Rotation2D angle={rot()} center={Point.from(50, -30, 0)}>
        <Rectangle
          center={Point.from(50, -30, 0)}
          width={60}
          height={50}
          color="orange"
          strokeWidth={1}
        />
      </Rotation2D>
    </Canvas>
  );
};

export default App;
