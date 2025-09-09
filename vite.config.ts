/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Prevent bundling of large, unused optional dependencies.
      // jspdf includes these but they are only needed for specific features
      // that this application does not use (rendering HTML/SVG to PDF).
      'html2canvas': path.resolve(__dirname, 'src/utils/dummyModule.ts'),
      'canvg': path.resolve(__dirname, 'src/utils/dummyModule.ts'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      all: true
    },
  },
});