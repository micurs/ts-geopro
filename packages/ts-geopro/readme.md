# ts-geopro

A TypeScript library for 3D geometric computations and transformations, designed following the principles of Geometric Programming.

## Overview

ts-geopro provides a comprehensive set of tools for handling 3D geometric operations with a focus on:

- Coordinate transformations and reference frames
- Vector and matrix operations
- Point manipulation and transformations
- High-performance computations using gl-matrix

## Features

### Core Components

- **Points**: 3D point representation with:
  - Homogeneous coordinates support
  - Frame-relative positioning
  - Transformation operations

- **Vectors**: Full 3D vector implementation including:
  - Unit vectors with automatic normalization
  - Vector operations (cross product, dot product)
  - Vector transformations between reference frames

- **Transformations**: Comprehensive transformation support:
  - Rotations around arbitrary axes
  - Translation operations
  - Composite transformations
  - Matrix-based operations using gl-matrix

- **Frames**: Reference frame transformations with support for:
  - Camera-style lookAt transformations
  - Frame composition and inversion
  - Relative and absolute coordinate transformations

