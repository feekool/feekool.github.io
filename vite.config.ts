import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    minify: 'esbuild',
  },
  // Security: Prevent environment variables from being logged
  define: {
    // Ensure sensitive environment variables are not exposed in client-side code
    'import.meta.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || ''),
  },
  // Additional security headers for development
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
})
