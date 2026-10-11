import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      globals: {
        global: false,
      },
    })
  ],
  base: '/',
  envDir: '..',
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: { host: '0.0.0.0', port: 5000, strictPort: true },
  
  define: {
    global: 'globalThis',
  },

  // 🚨 THE FIX: Force Vite to use a single WASM instance across all folders 🚨
  resolve: {
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/midnight-js-protocol'
    ]
  },

  build: {
    target: 'esnext',
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  },
  
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
    include: [
      'object-inspect',
      'level',
      'browser-level',
      'abstract-level',
      'cross-fetch',
      'fetch-retry' 
    ],
    exclude: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/midnight-js-protocol'
    ]
  }
});