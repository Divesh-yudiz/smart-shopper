import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['phaser'],
  },
  build: {
    chunkSizeWarningLimit: 20000, // Increased chunk size limit to allow bigger chunks during build
  },
  server: {
    port: 5001,
    allowedHosts: ['.ngrok-free.dev'],
  },
})