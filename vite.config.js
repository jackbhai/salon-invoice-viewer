import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work on GitHub Pages under any sub-path
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
})
