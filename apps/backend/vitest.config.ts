import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.json', '.node'],
  },
  test: {
    include: ['tests/**/*.test.js', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 45,
        branches: 35,
        functions: 40,
        lines: 45,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist-server/**',
        '**/migrations/**',
        '**/seeders/**',
        '**/tests/**',
        '**/vitest.config.ts',
        '**/config/**',
        '**/types.d.ts',
        '**/types/**',
        '**/app.ts',
        '**/server.ts',
        '**/controllers/**',
        '**/routes/**',
        '**/schemas/**',
        '**/utils/encryption.ts',
        '**/utils/logger.ts',
      ],
    },
  },
});
