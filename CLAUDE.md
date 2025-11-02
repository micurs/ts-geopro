# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

ts-geopro is a TypeScript library for 2D/3D geometric computations and
transformations. It provides comprehensive tools for handling 3D geometric
operations with coordinate transformations, vector/matrix operations, and point
manipulations using gl-matrix for performance.

The entire project is structured as a monorepo with multiple applications and
packages, all in TypeScript. The project aims to use a functional programming
style with immutable data structures. When editing or extending the code, please
adhere to these principles.

The repo package manager is pnpm, and Turbo is used for build orchestration
across the monorepo.

## Contribution Guidelines

### Tools

- Use the `tea` CLI tool to create and update issues.
- Use `pnpm` for package management.
- use `git` for version control.

Before making changes always:

1. Create a new issue describing the feature or bug fix.
2. Create a new branch from `main` for your work.
3. Commit changes with clear messages referencing the issue.
4. Add tests for new features or bug fixes.
5. Follow the coding style and conventions used in the existing codebase.

## Architecture

This is a monorepo using pnpm workspaces and Turbo for build orchestration:

- **packages/ts-geopro/**: Core library package with geometric entities and
  operations
- **apps/canvas-demo/**: Canvas-based demo application showcasing the library
- **apps/quadretti/**: Modern Solid.JS app with interactive 2D canvas rendering
- **apps/cli-demos/**: Command-line demonstration scripts

### Core Library Structure (packages/ts-geopro/src/)

- **geo-entities/**: Core geometric classes (Point, Vector, UnitVector, Frame,
  Ray)
- **transform.ts**: Affine 3D transformations
- **rotation.ts**: Rotation-only transformations
- **operations.ts**: High-level operations on geometric entities
- **math.ts**: Mathematical utilities
- **index.ts**: Main exports

The library uses gl-matrix for optimized matrix operations and follows
functional programming principles with immutable transformations.

## Testing

The project uses Vitest for testing with strict coverage thresholds. Tests are
located in `packages/ts-geopro/tests/` and follow the pattern
`{feature}.test.ts`. Coverage reports are generated in `tests-coverage/`.

## Publishing ts-geopro

The library is published to JSR (JavaScript Registry):

- `pnpm jsr:test-publish` - Dry run publish
- `pnpm jsr:publish` - Publish to JSR

## Key Development Notes

- All geometric entities are immutable - transformations create new instances
- Use `map()` function with Transform instances to create transformation
  functions
- The library supports both ES Modules and CommonJS
- Canvas demo includes scene graph functionality with viewport management
- Version updates are managed via `scripts/update-versions.ts` Deno script

### Architecture Patterns

- **Component-based rendering**: Geometric entities as Solid.JS components
- **Reactive drawing**: Components automatically redraw when props change
- **Viewport transformation**: 2D canvas transforms handled by ts-geopro
- **CSS Modules**: Scoped styling with CSS custom properties
- **Context pattern**: Shared canvas state via Solid.JS context
