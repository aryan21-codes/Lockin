import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // ─── Production chunk splitting ───────────────────────────
    // Splits heavy vendor libraries into separate cached chunks
    // so they don't re-download on every app update.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'animations';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query';
          }
        },
      },
    },
    // Increase chunk size warning limit since vendor chunks are intentionally larger
    chunkSizeWarningLimit: 600,
  },
})
