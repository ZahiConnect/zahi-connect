import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/rms': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      '/hotel': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/flight': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/booking': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
})
