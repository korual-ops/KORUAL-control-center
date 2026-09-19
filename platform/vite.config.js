import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2020',
    modulePreload: {
      polyfill: false,
    },
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
