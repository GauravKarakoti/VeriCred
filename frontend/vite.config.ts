import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
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

  resolve: {
    alias: {
      // 🚀 THE FIX: Polyfill WebSocket for isomorphic-ws in production build
      'isomorphic-ws': '/src/ws-polyfill.ts',
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/midnight-js-protocol'
    ]
  },

  build: {
    target: 'esnext', // Native support for top-level await
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    }
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