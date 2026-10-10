import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * U2 INCREDIBLY DEEP AUDIT:
 * - Hardened build configuration for the Electron renderer environment.
 * - Enforces chunk splitting for better parse times.
 * - Removes source maps in production to prevent reverse-engineering of ML UI logic.
 * - Sets base to './' so Electron can correctly resolve asset paths from file:// protocol.
 */
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron apps
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Security: Never leak source maps in production build
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunking for deterministic caching and rapid boot
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('zustand')) {
              return 'vendor-store';
            }
            return 'vendor-core';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    // Block outside network access during dev for security
    host: '127.0.0.1'
  }
});
