import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (important for Docker)
    port: 5173,
    watch: {
      usePolling: true, // Enable polling for Docker on Windows
      interval: 100, // Check for changes every 100ms
    },
    hmr: {
      host: 'localhost', // HMR host for WebSocket connection
      port: 5173,
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
})
