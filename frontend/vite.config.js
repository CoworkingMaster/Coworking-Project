import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // Escuchar en todas las interfaces (necesario en Docker)
    port: 5173,
    watch: {
      usePolling: true, // Hot-reload fiable con volúmenes Docker en Windows
    },
    proxy: {
      // Redirige /api al backend Django — evita problemas de CORS en desarrollo
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
