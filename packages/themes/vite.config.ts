import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    // Match the rest of the workspace: vitest 4 requires all projects to
    // share maxWorkers when run together (or to provide unique
    // sequence.groupOrder values). Aligning is simplest.
    pool: 'threads',
    isolate: false,
    fileParallelism: true,
    minWorkers: 1,
    maxWorkers: 2,
  },
});
