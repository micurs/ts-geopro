# @micurs/ts-geosolid-canvas

SolidJS canvas components library for geometric rendering with RoughJS hand-drawn style.

## Overview

This library provides reactive SolidJS components for rendering 2D geometric shapes on HTML canvas with viewport management, zoom, and pan capabilities.

## Components

### Canvas
Main canvas component with viewport management, zoom/pan controls, and transformation support.

### Shape Components
- **Line** - Render lines between two points
- **PerfectGrid** - Render adaptive grid with origin axes
- **Ellipse** - Render ellipses with optional fill
- **Rectangle** - Render rectangles with optional fill

### Transform Components
- **Rotation2D** - Rotate children around a center point
- **Translate2D** - Translate children by a 2D offset vector

### Selection
- **Select2D** - Selection overlay with interactive handles around children.
  Displays a dashed bounding box and handle circles at corners + rotation
  point. Drag the bounding box to translate, drag corner handles to scale,
  or drag the rotation handle (center-top) to rotate. Hold Shift while
  dragging a corner handle for uniform scaling. Hover highlights the box
  (solid, 2px) and handles (yellow fill).

  ```tsx
  import { Select2D, Ellipse, Rectangle } from '@micurs/ts-geosolid-canvas';
  import { Point } from '@micurs/ts-geopro';

  <Select2D editable={true} color="#00aaff" padding={4}>
    <Ellipse id="shape1" center={Point.from(0, 0, 0)} width={100} height={60} color="#ff6600" />
    <Rectangle id="shape2" center={Point.from(80, 40, 0)} width={60} height={40} color="#2266ff" />
  </Select2D>
  ```

  **Props:**
  - `editable` - enable selection UI with interactive handles (default: `false`)
  - `color` - dashed border color (default: `#00aaff`)
  - `padding` - padding around union bounds in world units (default: 6)
  - `snapRotation` - snap rotation to 90-degree increments (default: `false`)
  - `snapRotationColor` - rotation arc/handle color when snapped (default: `#ff8c00`)

  Each child must have a unique `id` prop for bounding box registration.

## Features

- SolidJS reactive rendering
- RoughJS hand-drawn style graphics
- Viewport transformation and scaling
- Mouse wheel zoom
- Drag to pan
- Responsive canvas sizing
- Selection overlays with interactive drag translation, rotation, and scale

## Usage

See the quadretti app for usage examples.

### Building custom canvas components

Use `buildCanvasComponent()` to create SolidJS components from a drawing
function. The generated component draws reactively inside the nearest `Canvas`
context and receives the current viewport plus the component props.

```tsx
import { buildCanvasComponent } from '@micurs/ts-geosolid-canvas';
import type { Point } from '@micurs/ts-geopro';

interface CrossProps {
  center: Point;
  size: number;
  color?: string;
}

const Cross = buildCanvasComponent<CrossProps>((vp, props) => {
  const { ctx } = vp;
  const halfSize = props.size / 2;

  ctx.strokeStyle = props.color ?? 'black';
  ctx.beginPath();
  ctx.moveTo(props.center.x - halfSize, props.center.y);
  ctx.lineTo(props.center.x + halfSize, props.center.y);
  ctx.moveTo(props.center.x, props.center.y - halfSize);
  ctx.lineTo(props.center.x, props.center.y + halfSize);
  ctx.stroke();
});
```

## Canvas/Geopro Utility Functions

The library provides first-class utility functions for interop between `CanvasRenderingContext2D`
and `@micurs/ts-geopro` transforms. These are exported from `@micurs/ts-geosolid-canvas`.

### Coordinate conversion

- `worldPointToScreen(transform, point)` — project a world-space point to screen pixels under the renderer's Y-negated convention.
- `screenPointToWorld(transform, point)` — inverse of `worldPointToScreen`.
- `screenVectorToWorld(scaleFactor, vector)` — convert a screen-space delta to world space.
- `canvasPointFromEvent(canvas, event)` — compute the mouse position relative to the canvas element.
- `applyStandardWorldTransform(transform, point)` — apply a Transform using standard (non-transposed) gl-matrix convention.

### Canvas transform helpers

- `canvasTransformFromGeoTransform(transform)` — derive the six `setTransform(a, b, c, d, e, f)` values from a geo Transform.
- `setCanvasWorldTransform(ctx, transform)` — apply a geo Transform as the current canvas context transform.
- `resetCanvasTransform(ctx)` — reset to identity (screen coordinates).

### Scoped drawing helpers

- `drawInWorldCoordinates(ctx, transform, draw)` — save, apply world transform, draw, restore.
- `drawInScreenCoordinates(ctx, draw)` — save, reset to identity, draw, restore.

```tsx
import { drawInWorldCoordinates, drawInScreenCoordinates } from '@micurs/ts-geosolid-canvas';

// Draw a shape in world space
drawInWorldCoordinates(ctx, viewport.transform, () => {
  ctx.strokeRect(x, y, w, h);
});

// Draw UI overlays in screen space
drawInScreenCoordinates(ctx, () => {
  ctx.fillText('label', 10, 20);
});
```

## Version

0.6.0
