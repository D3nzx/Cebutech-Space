import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Drop all console.* and debugger calls only in production builds.
  // The dev server (command === 'serve') keeps them so debugging still works.
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@fullcalendar')) {
              return 'vendor-fullcalendar';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            return 'vendor';
          }
        },
      },
    },
  },
}))
