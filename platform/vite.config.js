import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function classicBootstrap() {
  return {
    name: 'korual-classic-bootstrap',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
          '<script defer data-korual-app src="$1"></script>'
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), classicBootstrap()],
  base: '/',
  build: {
    target: 'es2020',
    modulePreload: false,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
