// NOTE: defineWorkspace is not available in the installed vitest version (^4.1.5).
// Attempted migration to defineWorkspace threw "defineWorkspace is not a function"
// at runtime. Using defineConfig with test.projects instead until vitest exposes
// defineWorkspace as a named export in this version.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pool config (threads, isolate:false, parallelism) is set per-project so
    // that `pnpm --filter <pkg> test` (which uses the per-project config
    // directly) and the workspace runner both pick up the same tuning.
    projects: [
      'packages/core/vite.config.ts',
      'packages/themes/vite.config.ts',
      'packages/components/vite.config.ts',
      'apps/docs/vitest.config.ts',
    ],
  },
});
