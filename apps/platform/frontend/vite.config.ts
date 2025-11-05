import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (important for Docker)
    port: 5173,
    // Disable file watching completely if memory is constrained (set DISABLE_FILE_WATCH=1)
    // This will require manual browser refresh on code changes
    watch: process.env.DISABLE_FILE_WATCH === '1' ? null : {
      usePolling: true, // Enable polling for Docker on Windows
      interval: 2000, // Check for changes every 2000ms (increased to reduce memory usage)
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.pytest_cache/**',
        '**/__pycache__/**',
        '**/.venv/**',
        '**/logs/**',
        '**/migrations/**',
        '**/fixtures/**',
        '**/tests/**',
        '**/.dockerignore',
        '**/Dockerfile*',
        '**/package-lock.json',
        '**/yarn.lock',
        '**/pnpm-lock.yaml',
        '**/.env*',
        '**/*.log',
        '**/.cache/**',
        '**/.vscode/**',
        '**/.idea/**',
      ],
    },
    hmr: {
      host: 'localhost', // HMR host for WebSocket connection
      port: 5173,
      // Disable HMR file watching if memory is constrained (set DISABLE_HMR=1)
      // This will still serve files but won't watch for changes
      ...(process.env.DISABLE_HMR === '1' ? { overlay: false } : {}),
    },
    fs: {
      // Restrict file serving to reduce memory usage
      strict: true,
      allow: ['.'],
    },
    proxy: {
      // Proxy bot and session API requests to messaging gateway
      '/api/bots': {
        target: process.env.VITE_MESSAGING_GATEWAY_URL || 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/conversations': {
        target: process.env.VITE_MESSAGING_GATEWAY_URL || 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/sessions': {
        target: process.env.VITE_MESSAGING_GATEWAY_URL || 'http://localhost:8082',
        changeOrigin: true,
      },
      // Proxy other API requests to platform backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    // Reduce memory usage during dependency optimization
    entries: ['src/main.tsx'],
    // Disable auto-discovery to reduce memory usage
    include: [],
    exclude: [],
  },
  build: {
    // Reduce memory usage during build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable manual chunking to reduce memory usage
      },
    },
  },
  // Disable CSS code splitting to reduce memory usage
  css: {
    devSourcemap: false,
  },
  // Reduce logging to save memory
  logLevel: process.env.DISABLE_HMR === '1' ? 'warn' : 'info',
})
