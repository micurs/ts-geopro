# ts-geopro: 3D Geometric Programming Library

A robust TypeScript library for 3D geometric computations and transformations, designed for precision and performance.

## Overview

ts-geopro provides a comprehensive set of tools for handling 3D geometric operations with a focus on:

- Coordinate transformations and reference frames
- Vector and matrix operations
- Point manipulation and transformations
- High-performance computations using gl-matrix

## Features

### Core Components

- **Frames**: Reference frame transformations with support for:
  - Translation and rotation operations
  - Camera-style lookAt transformations
  - Frame composition and inversion
  - Relative and absolute coordinate transformations

- **Vectors**: Full 3D vector implementation including:
  - Unit vectors with automatic normalization
  - Vector operations (cross product, dot product)
  - Vector transformations between reference frames

- **Points**: 3D point representation with:
  - Homogeneous coordinates support
  - Frame-relative positioning
  - Transformation operations

- **Transformations**: Comprehensive transformation support:
  - Rotations around arbitrary axes
  - Translation operations
  - Composite transformations
  - Matrix-based operations using gl-matrix

## Installation

```bash
npm install @micurs/ts-geopro
# or
pnpm add @micurs/ts-geopro
```

## Usage

### Basic Vector Operations

```typescript
import { Vector, UnitVector } from '@micurs/ts-geopro';

// Create and manipulate vectors
const v1 = new Vector(1, 0, 0);
const v2 = new Vector(0, 1, 0);
const crossProduct = UnitVector.crossProduct(v1, v2);
```

### Reference Frame Transformations

```typescript
import { Frame, Point, UnitVector } from '@micurs/ts-geopro';

// Create a camera-style reference frame
const eye = new Point(0, 0, 5);
const target = new Point(0, 0, 0);
const up = UnitVector.fromValues(0, 1, 0);
const cameraFrame = Frame.lookAt(eye, target, up);

// Transform points between frames
const worldPoint = new Point(1, 1, 1);
const localPoint = worldPoint.relative(cameraFrame);
```

### Geometric Transformations

```typescript
import { Frame, Point, Transform } from '@micurs/ts-geopro';

// Create a rotation frame
const origin = new Point(0, 0, 0);
const rotationFrame = Frame.rotationZ(origin, Math.PI/4); // 45 degrees

// Convert frame to transform
const transform = rotationFrame.toTransform();
```

## Development

The project uses modern TypeScript tooling:

```bash
# Install dependencies
pnpm install

# Run tests with coverage
pnpm test

# Watch mode for development
pnpm run watch:test

# Build the library
pnpm run build
```

## Technical Details

- Built with TypeScript for type safety
- Uses gl-matrix for optimized matrix operations
- Zero dependencies (except gl-matrix)
- Comprehensive test coverage
- ES Modules and CommonJS support
- Tree-shakeable exports

## API Documentation

The library provides several key classes:

- `Frame`: Represents a coordinate reference frame
- `Vector`: Represents a 3D vector
- `UnitVector`: Represents a normalized 3D vector
- `Point`: Represents a point in 3D space
- `Transform`: Represents a geometric transformation
- `Rotation`: Handles rotation operations

Each class is fully documented with TypeScript types and JSDoc comments.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests with `pnpm test`
4. Submit a pull request

Bug reports and pull requests are welcome on GitHub.
