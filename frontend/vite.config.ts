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
        global: false, // <-- Disable the plugin's 'global' polyfill to fix the Wasm binding crash
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
  
  // We handle 'global' manually here instead
  define: {
    global: 'globalThis',
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
      '@midnight-ntwrk/midnight-js-level-private-state-provider'
    ],
    exclude: [
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/compact-runtime'
    ]
  }
});