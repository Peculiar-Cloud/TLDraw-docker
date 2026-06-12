import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  publicDir: '../../public',
  server: {
    port: 5757,
    proxy: {
      '/api': 'http://127.0.0.1:5858',
    },
  },
  optimizeDeps: {
    exclude: ['@tldraw/assets'],
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
})
