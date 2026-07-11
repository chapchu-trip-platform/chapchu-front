import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    exclude: ['node_modules', '.next', 'coverage', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['.next/**', 'coverage/**', 'node_modules/**', 'test/**', '**/*.config.*'],
    },
  },
})
