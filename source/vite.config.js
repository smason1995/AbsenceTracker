import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures relative paths for assets
  build: {
    outDir: 'dist', // Output directory for production build
    chunkSizeWarningLimit: 1500, // Increase chunk size warning limit
  },
  plugins: [react()],
})
