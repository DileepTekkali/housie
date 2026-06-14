import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the client runs on :5173 and proxies socket + api calls to the
// Node server on :3001. In production the Node server serves the built files.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
