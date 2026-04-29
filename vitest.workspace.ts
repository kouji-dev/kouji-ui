import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vite.config.ts',
      'packages/ui/vite.config.ts',
    ],
  },
});
