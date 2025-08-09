import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// set this to your Railway public URL
const RAILWAY = 'https://amusing-endurance-production.up.railway.app'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST
      '/api': {
        target: RAILWAY,
        changeOrigin: true,
      },
      // WebSocket (Socket.IO)
      '/socket.io': {
        target: RAILWAY,
        ws: true,
        changeOrigin: true,
      },
      // optional: health passthrough
      '/health': {
        target: RAILWAY,
        changeOrigin: true,
      }
    }
  }
})