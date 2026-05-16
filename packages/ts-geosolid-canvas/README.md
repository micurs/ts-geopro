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

## Features

- SolidJS reactive rendering
- RoughJS hand-drawn style graphics
- Viewport transformation and scaling
- Mouse wheel zoom
- Drag to pan
- Responsive canvas sizing

## Dependencies

- solid-js ^1.9.6
- roughjs ^4.6.6
- @micurs/ts-geopro workspace:*

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

## Version

0.1.0
