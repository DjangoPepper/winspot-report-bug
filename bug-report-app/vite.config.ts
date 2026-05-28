import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/winspot-report-bug/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
