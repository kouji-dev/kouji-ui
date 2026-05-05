import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineProject({
  plugins: [angular()],
  resolve: {
    alias: {
      '@kouji-ui/core':       resolve(__dirname, '../../packages/core/src/public-api.ts'),
      '@kouji-ui/components': resolve(__dirname, '../../packages/components/src/public-api.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
