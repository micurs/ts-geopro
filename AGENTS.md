# ts-geopro LLM Agent Guide

## Overview

- `ts-geopro` is a TypeScript monorepo that houses the core 3D geometric
  programming library plus companion demo apps and a SolidJS canvas component
  package.
- Runtime dependencies are intentionally minimal: the core library only depends
  on `gl-matrix`; other packages depend on SolidJS/roughjs as needed.
- The workspace is managed with `pnpm` (see `packageManager` in `package.json`)
  and tasks are orchestrated with `turbo`.
- Tooling stack: TypeScript, Vite, Vitest (with coverage), Deno for scripts/CLI
  demos, and optional `tea` CLI + `scripts/gitea-helper.sh` for issue/PR
  automation.

## Skills

They are located in the `.skills/` directory and designed to guide agents
through specific workflows. Each skill has a `SKILL.md` that defines its
purpose, when to use it.

- `planning`: For drafting implementation plans based on Gitea tickets. Requires
  a ticket reference and produces structured plans with rationale, steps,
  version changes, and tests.

- `code-review`: For reviewing PRs with a focus on code quality,
  maintainability, and alignment with project conventions. Provides actionable
  feedback and a summary of findings.

## Repository Layout

- `packages/ts-geopro`: Core library with geometric entities
  (`src/geo-entities`), transformations (`src/transform.ts`, `src/rotation.ts`),
  operations/utilities (`src/operations.ts`, `src/math.ts`), and bundled exports
  (`src/index.ts`). Tests live in `packages/ts-geopro/tests` and emit coverage
  into `packages/ts-geopro/tests-coverage`. Publishing metadata resides in
  `jsr.json`.
- `packages/ts-geosolid-canvas`: SolidJS canvas components (Canvas, Line,
  PerfectGrid, Ellipse, Rectangle) with RoughJS styling and viewport controls;
  depends on `@micurs/ts-geopro`. Demo config sits under `demo/` and
  `vite.demo.config.ts`.
- `demos/canvas`: Basic Vite app that renders a 3D scene using
  `@micurs/ts-geopro` (`pnpm dev:demo canvas`).
- `demos/projection`: Visualization playground for projection math using the
  core library (`pnpm dev:demo projection`).
- `demos/quadretti`: SolidJS app that draws on canvas via both
  `@micurs/ts-geopro` and `@micurs/ts-geosolid-canvas`
  (`pnpm dev:demo quadretti`).
- `demos/cli`: Small TypeScript scripts executed with Deno (run via
  `pnpm dev:demo cli` or `pnpm cli-demos`) to showcase CLI usage.
- Supporting files: `.gitea/workflows/verify-pr.yml` (CI), `.githooks/pre-push`
  installed via `scripts/install-hooks.sh`, `scripts/gitea-helper.sh` for Gitea
  automation, and `scripts/update-versions.ts` to bump package versions.

## Development & Tooling

- Install dependencies with `pnpm install` (postinstall automatically copies git
  hooks from `.githooks/`).
- Common workspace commands:
  - `pnpm build` → runs turbo build across packages (non-cached) and outputs to
    each `dist/`.
  - `pnpm lint` → invokes each package's lint task (packages use Deno lint
    configs).
  - `pnpm test` → turbo task that depends on lint/build and runs Vitest with
    coverage where configured.
  - `pnpm dev:demo <demo-name>` → starts the named demo from `demos/`.
  - `pnpm start:demo <demo-name>` → builds the named demo and starts it outside
    dev mode.
  - `pnpm dev:gsc` → starts the watch build for `@micurs/ts-geosolid-canvas`.
  - `pnpm cli-demos` → executes `demos/cli/point-vector.ts` with Deno.
- To run package-specific scripts, use `pnpm --filter <package> <script>` (e.g.,
  `pnpm --filter @micurs/ts-geopro watch:test`).

## Contribution Workflow

1. Open an issue describing the bugfix/feature before coding; track ongoing work
   through the issue.
2. For Plan Mode or pre-implementation planning, use the repo-local
   `.skills/planning` skill. Plans must reference a Gitea ticket and include the
   required ticket/branch, rationale, steps, version changes, and tests
   sections.
3. Branch off `main`, naming the branch after the issue with the
   `<username>/<ticket-number>-<short-title>` convention, and keep commits
   scoped/atomic.
4. Reference the issue ID in commit messages and PR descriptions.
5. Add/update tests for every behavior change.
6. Run `pnpm lint`, `pnpm build`, and `pnpm test` locally (the pre-push hook
   enforces this).
7. Use `tea` CLI or `./scripts/gitea-helper.sh` to create/update issues and PRs
   against the Gitea instance (`tea login` or `GITEA_TOKEN` env var required);
   prefer `origin-gitea` for publishing project branches. Use
   `./scripts/gitea-helper.sh pr comments <pr-number>` to read unresolved PR
   comments, `./scripts/gitea-helper.sh pr comment <file> <line> < comment.md`
   to add source-line feedback, and
   `./scripts/gitea-helper.sh pr reply <comment-id> < reply.md` to reply.
8. When opening a PR, link the issue(s) being addressed and wait for approval;
   merges happen after CI (Verify Pull Request workflow) passes.

## Architecture & Coding Guidelines

- Favor functional, immutable data structures. Core geometric entities (`Point`,
  `Vector`, `UnitVector`, `Frame`, `Ray`) never mutate; transformations create
  new instances.
- `Transform` (4x4 matrices via `gl-matrix`) handles affine transforms, while
  `Rotation` focuses on quaternion-based rotations. Use the curried `map()`
  helper to apply transforms, `compose()` to combine transforms, `add()` for
  vector/point addition, and `absolute()`/`relative()` for frame conversion.
- Keep exports centralized in `packages/ts-geopro/src/index.ts` for
  tree-shakeable builds. Maintain ES Module semantics (the package ships as
  ESM).
- `@micurs/ts-geosolid-canvas` follows SolidJS patterns: component-based
  rendering, context for shared canvas state, CSS Modules for scoped styling,
  RoughJS for sketch aesthetics, and viewport transform utilities powered by the
  core library.
- Demo apps illustrate different integration patterns:
  - `canvas`: HTML canvas rendering pipeline using rays, points, frames.
  - `projection`: Math-first visualization for projection logic.
  - `quadretti`: Reactive drawing with zoom/pan, uses Solid components and
    viewport transforms.
  - `cli`: Quick scripts demonstrating vector math and transforms.

## Testing, CI, and Publishing

- `pnpm test` leverages Vitest; `packages/ts-geopro` enforces coverage
  (`@vitest/coverage-v8`) and writes reports to `tests-coverage/`.
- Linting uses `deno lint` per package configs (`deno.lint.json`).
- `.gitea/workflows/verify-pr.yml` installs Node 20, Deno 2.x, pnpm, and runs
  `pnpm install` + `pnpm test` on pull requests.
- Publishing to JSR is handled inside `packages/ts-geopro`:
  - Dry run: `pnpm --filter @micurs/ts-geopro jsr:test-publish`
  - Real publish: `pnpm --filter @micurs/ts-geopro jsr:publish`
- Use `pnpm version-update` (runs the Deno script) to bump versions consistently
  across packages before publishing.

## Key Reminders for Agents

- Respect the monorepo structure and avoid touching generated `dist/` outputs
  unless explicitly necessary.
- When adding files, default to TypeScript + Vite conventions that already
  exist; match existing ESLint/Deno lint preferences.
- Keep documentation synchronized: update `readme.md` (and package-specific
  READMEs) alongside library changes when APIs shift.
- If you introduce new tooling or dependencies, update `package.json`,
  `pnpm-lock.yaml`, and (when relevant) `turbo.json`.
- Verify any assumption against the actual source—geometric helpers are
  thoroughly typed, so lean on the existing APIs instead of reimplementing math
  utilities.
- Always use curly braces for control flow bodies (`if`, `else`, `for`, `while`,
  `do`), even for single-line statements.
