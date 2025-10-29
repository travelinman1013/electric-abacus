import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (staging, production, development)
  // const env = loadEnv(mode, process.cwd(), ''); // Available for future use

  return {
    plugins: [react()],
    // Environment-specific config can go here
    define: {
      __VITE_ENV__: JSON.stringify(mode),
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        { find: 'src', replacement: path.resolve(__dirname, './src') },
        { find: '@domain/terminology', replacement: path.resolve(__dirname, '../../packages/domain/src/terminology') },
        { find: '@domain', replacement: path.resolve(__dirname, '../../packages/domain/src') },
        {
          find: '@electric/firebase',
          replacement: path.resolve(__dirname, '../../packages/firebase/src/client-only.ts')
        }
      ]
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
      coverage: {
        reporter: ['text', 'lcov'],
        provider: 'v8',
        thresholds: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      }
    }
  };
});
