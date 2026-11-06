import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH sets where the UI is hosted, e.g. "/" (Render) or "/interns/"
  // (sub-path behind a reverse proxy). Defaults to "/".
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    // During `npm run dev`, forward API calls to the Express server.
    proxy: { '/api': 'http://localhost:5000' },
  },
})
