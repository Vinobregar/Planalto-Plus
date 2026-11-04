import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lucide-react': resolve(
        __dirname,
        'node_modules/lucide-react/dist/cjs/lucide-react.js'
      ),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      maxParallelFileOps: 20,
      input: {
        popup: resolve(__dirname, 'popup.html'),
        demo: resolve(__dirname, 'index.html'),
      },
    },
  },
});
