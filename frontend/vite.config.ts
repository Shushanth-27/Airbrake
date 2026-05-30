import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@portal/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: false, // Don't clean dist before build — avoids Windows file lock issues
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
