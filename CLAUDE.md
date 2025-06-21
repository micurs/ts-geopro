# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

ts-geopro is a TypeScript library for 3D geometric computations and
transformations. It provides comprehensive tools for handling 3D geometric
operations with coordinate transformations, vector/matrix operations, and point
manipulations using gl-matrix for performance.

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

## Development Commands

### Root Level (using Turbo)

- `pnpm dev:c` - Start development mode for `canvas-demo` app
- `pnpm dev:q` - Start development mode for `quadretti` app
- `pnpm build` - Build all packages
- `pnpm test` - Run tests for all packages with linting
- `pnpm lint` - Lint all packages

### Core Library (packages/ts-geopro/)

- `pnpm test` - Run Vitest tests with coverage (89% lines, 85% functions, 90%
  branches)
- `pnpm watch:test` - Run tests in watch mode
- `pnpm build` - TypeScript compilation + Vite build
- `pnpm dev:c` or `pnpm dev:q` - Build in watch mode
- `pnpm lint` - Deno linting with auto-fix

### Canvas Demo (apps/canvas-demo/)

- `pnpm dev:c` - TypeScript compilation + Vite dev server
- `pnpm build` - Production build
- `pnpm preview` - Preview production build

### Quadretti App (apps/quadretti/)

- `pnpm dev:q` - Vite dev server (port 3000)
- `pnpm build` - TypeScript compilation + Vite production build
- `pnpm preview` - Preview production build

### CLI Demos

- `pnpm cli-demos` - Run point-vector demo via Deno

## Testing

The project uses Vitest for testing with strict coverage thresholds. Tests are
located in `packages/ts-geopro/tests/` and follow the pattern
`{feature}.test.ts`. Coverage reports are generated in `tests-coverage/`.

## Publishing

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

## Quadretti App Architecture

The Quadretti app is a modern interactive canvas application built with:

### Tech Stack
- **Solid.JS**: Reactive UI framework with fine-grained reactivity
- **TailwindCSS v4**: Utility-first CSS with CSS custom properties
- **RoughJS**: Hand-drawn style 2D graphics library
- **Vite**: Fast build tool with HMR support

### Key Components
- **Canvas**: Main rendering component with zoom/pan functionality
  - Viewport management with 2D transformations
  - ResizeObserver for responsive canvas sizing
  - Mouse wheel zoom and drag-to-pan interactions
  - Integration with ts-geopro Transform system
- **Line**: Geometric line component using RoughJS for sketchy rendering
  - Reactive props with createEffect for auto-redraw
  - Uses ts-geopro Point entities for coordinates
- **Canvas Context**: Solid.JS context for viewport state sharing

### Architecture Patterns
- **Component-based rendering**: Geometric entities as Solid.JS components
- **Reactive drawing**: Components automatically redraw when props change
- **Viewport transformation**: 2D canvas transforms handled by ts-geopro
- **CSS Modules**: Scoped styling with CSS custom properties
- **Context pattern**: Shared canvas state via Solid.JS context
