import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@scenes': path.resolve(__dirname, 'src/scenes'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@fx': path.resolve(__dirname, 'src/fx'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Split Babylon into its own chunk — speeds up HMR dramatically.
        manualChunks: {
          babylon: [
            '@babylonjs/core',
            '@babylonjs/gui',
            '@babylonjs/loaders',
            '@babylonjs/materials',
            '@babylonjs/post-processes',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@babylonjs/core',
      '@babylonjs/gui',
      '@babylonjs/materials',
      '@babylonjs/post-processes',
    ],
    esbuildOptions: { target: 'es2022' },
  },
  esbuild: { target: 'es2022' },
});
