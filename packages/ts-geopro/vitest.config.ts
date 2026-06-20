import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: './tests-coverage',
      thresholds: {
        lines: 88,
        functions: 85,
        branches: 90,
      },
    },
  },
});
