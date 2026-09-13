import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Express API runs separately; forward /api to it so
    // the browser only ever talks to one origin.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
