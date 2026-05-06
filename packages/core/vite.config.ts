import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineProject({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    // Threads beat forks substantially on Windows; combined with isolate:false
    // each worker pays jsdom + Angular TestBed env cost once and reuses it
    // across all spec files routed to that worker.
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
