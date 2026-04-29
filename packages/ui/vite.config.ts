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
  },
});
