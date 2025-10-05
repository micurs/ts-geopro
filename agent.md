
# ts-geopro: 3D Geometric Programming Library

This project, `ts-geopro`, is a TypeScript-based library for 3D geometric computations and transformations. It is designed with a focus on providing a comprehensive set of tools for handling 3D geometric operations, including coordinate transformations, vector and matrix operations, and point manipulation. The library is built with TypeScript for type safety and uses `gl-matrix` for optimized matrix operations. It has zero dependencies other than `gl-matrix`.

## Project Structure

The project is a monorepo managed with `pnpm` and `turbo`. It contains the core `ts-geopro` library and two demo applications that showcase its usage.

- **`packages/ts-geopro`**: This is the core library, containing all the geometric entities and transformation logic.
- **`apps/canvas-demo`**: A demo application that uses the `ts-geopro` library to render 3D objects on an HTML canvas.
- **`apps/quadretti`**: Another demo application, built with Solid.js, that demonstrates the use of the library for 2D drawing on a canvas.
- **`apps/cli-demos`**: A set of command-line demos that showcase basic vector and point operations.

## Core Library (`ts-geopro`)

The core library is located in `packages/ts-geopro`. It provides a set of classes for representing and manipulating geometric entities in 3D space.

### Geometric Entities

The fundamental geometric entities are defined in `packages/ts-geopro/src/geo-entities`:

- **`Point`**: Represents a point in 3D space with homogeneous coordinates.
- **`Vector`**: Represents a 3D vector.
- **`UnitVector`**: A normalized 3D vector.
- **`Frame`**: Represents a coordinate reference frame, enabling transformations between different coordinate systems.
- **`Ray`**: Represents a ray in 3D space, defined by an origin point and a direction vector.

### Transformations

The library provides a powerful set of tools for performing geometric transformations:

- **`Transform`**: Represents a general affine transformation in 3D space, including rotation, translation, and scaling. It is implemented using a 4x4 matrix.
- **`Rotation`**: Represents a rotation in 3D space, implemented using quaternions for efficient and stable rotations.

### Operations

The library offers a rich set of operations that can be performed on the geometric entities:

- **`map`**: A curried function that applies a transformation to a geometric entity.
- **`compose`**: A function to compose multiple transformations into a single one.
- **`add`**: A function to add vectors or a vector and a point.
- **`absolute` and `relative`**: Functions to convert coordinates between different reference frames.

## Demo Applications

The two demo applications provide practical examples of how to use the `ts-geopro` library.

### `canvas-demo`

This application demonstrates how to use the library to create a 3D scene and render it on an HTML canvas. It showcases the creation of geometric entities like `Ray`, `Point`, and `Frame`, and their use in a 3D environment.

### `quadretti`

This application is built with Solid.js and uses the `ts-geopro` library for 2D drawing on a canvas. It demonstrates how to create and manipulate 2D shapes like lines, rectangles, and ellipses using the library's core concepts.

## Development and Tooling

The project uses modern TypeScript tooling:

- **`pnpm`**: For package management.
- **`turbo`**: For managing the monorepo and running tasks efficiently.
- **`vite`**: As a build tool for the library and demo applications.
- **`vitest`**: For running tests.
- **`deno`**: For running scripts and CLI demos.

The project has a comprehensive test suite, ensuring the correctness of the geometric computations. The tests are located in `packages/ts-geopro/tests`.
