# ts-geopro: 3D Geometric Programming Library

A TypeScript library for 3D geometric computations and transformations, designed following the principles of Geometric Programming.

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

- **Projections**: Full support for 3D projection:
  - Orthographic projection
  - Perspective projection


## Installation

Depending on your environment and package manager use one of the following:

* npm: `npx jsr add @micurs/ts-geopro`
* yarn `yarn dlx jsr add @micurs/ts-geopro`
* pnpm: `pnpm dlx jsr add @micurs/ts-geopro`
* deno: `deno add jsr:@micurs/ts-geopro`
* bun `bunx jsr add @micurs/ts-geopro`

## Usage

### Basic Vector Operations

```typescript
import { Point, Vector, UnitVector, add } from '@micurs/ts-geopro';

const p1 = Point.from(2, 3, 8);
const p2 = Point.from(10, 10, 10);

const fromTwoPoints = Vector.fromPoints(p2, p1);
console.log('Vector from 2 points: ', ` ${p2} - ${p1} =`, fromTwoPoints.toString());

const v1 = Vector.from(1, 0, 0);
const v2 = Vector.from(0, 1, 0);
const crossProduct = UnitVector.crossProduct(v1, v2);

console.log('UnitVector from cross product: ', ` ${v1} X ${v2} =`, crossProduct.toString());

const pStart = Point.from(4, 5, 10);
const vDir = Vector.from(6, 5, 0);

const newPoint = add(pStart, vDir);

console.log('Point from Point + Vector: ', ` ${pStart} + ${vDir} =`, newPoint.toString());

const vDir1 = Vector.from(1, 1, 0);
const vDir2 = Vector.from(1, -1, 0);

const inBetweenDir = UnitVector.from(add(vDir1, vDir2));

console.log('Direction in between two vectors: ', ` ${vDir1} + ${vDir2} =`, inBetweenDir.toString());
```



### Reference Frame Transformations

```typescript
```

### Geometric Transformations

```typescript
import { Point, Projection } from '@micurs/ts-geopro';

const p = Point.from(1, 1, -1);

const perspective = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
const projected = perspective.apply(p);

console.log('Perspective projection: ', projected.toString());

const orthographic = Projection.orthographic(-1, 1, -1, 1, 0.1, 100);
const projected2 = orthographic.apply(p);

console.log('Orthographic projection: ', projected2.toString());
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
- `Vector`: Represents a 3D vector in 3D space
- `UnitVector`: Represents a normalized 3D vector
- `Point`: Represents a point in 3D space
- `Transform`: Represents a geometric affine 3D transformation
- `Rotation`: Represents rotation only transformations
- `Projection`: Represents a projection transformation

Each class is fully documented with TypeScript types and JSDoc comments.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests with `pnpm test`
4. Submit a pull request

Bug reports and pull requests are welcome on GitHub.
