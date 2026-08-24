import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/users': { target: 'http://localhost:8080', changeOrigin: true },
      '/devices': { target: 'http://localhost:8080', changeOrigin: true },
      '/light-readings': { target: 'http://localhost:8080', changeOrigin: true },
      '/alarm-logs': { target: 'http://localhost:8080', changeOrigin: true },
      '/threshold-config': { target: 'http://localhost:8080', changeOrigin: true },
      '/control-logs': { target: 'http://localhost:8080', changeOrigin: true },
      '/knowledge-chunks': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
