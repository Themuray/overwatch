import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [react(), cesium()],
  define: { global: 'globalThis' },
  server: {
    proxy: {
      // NOAA NDBC buoy data (no CORS headers on origin)
      '/api/ndbc': {
        target: 'https://www.ndbc.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ndbc/, ''),
      },
      // NOAA NHC storm data (no CORS headers on origin)
      '/api/nhc': {
        target: 'https://www.nhc.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhc/, ''),
      },
    },
  },
})
