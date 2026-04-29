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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
    },
  },
});
