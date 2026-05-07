import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineProject({
  plugins: [angular()],
  resolve: {
    alias: [
      { find: /^@kouji-ui\/core\/(.*)$/, replacement: resolve(__dirname, '../../packages/core/src/$1') },
      { find: '@kouji-ui/core', replacement: resolve(__dirname, '../../packages/core/src/public-api.ts') },
      { find: /^@kouji-ui\/components\/(.*)$/, replacement: resolve(__dirname, '../../packages/components/src/$1') },
      { find: '@kouji-ui/components', replacement: resolve(__dirname, '../../packages/components/src/public-api.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    // Match the core/components tuning: threads + isolate:false amortizes the
    // jsdom + Angular TestBed env init cost across files in the same worker.
    pool: 'threads',
    isolate: false,
    fileParallelism: true,
    minWorkers: 1,
    maxWorkers: 2,
  },
});
