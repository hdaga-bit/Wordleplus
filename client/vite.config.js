import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// set this to your Railway public URL
const RAILWAY = "https://wordleplus-production.up.railway.app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST
      "/api": {
        target: RAILWAY,
        changeOrigin: true,
      },
      // WebSocket (Socket.IO)
      "/socket.io": {
        target: RAILWAY,
        ws: true,
        changeOrigin: true,
      },
      // optional: health passthrough
      "/health": {
        target: RAILWAY,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
