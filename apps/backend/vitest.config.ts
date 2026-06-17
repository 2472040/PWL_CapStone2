import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.json', '.node'],
  },
  test: {
    include: ['tests/**/*.test.js', 'tests/**/*.test.ts'],
  },
});
