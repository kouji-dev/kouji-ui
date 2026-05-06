import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineProject({
  plugins: [angular()],
  resolve: {
    alias: {
      '@kouji-ui/core': resolve(__dirname, '../core/src/public-api.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    // Threads beat forks on Windows; isolate:false reuses jsdom + Angular
    // TestBed env per worker across files.
    pool: 'threads',
    isolate: false,
    fileParallelism: true,
    minWorkers: 1,
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
    },
  },
});
