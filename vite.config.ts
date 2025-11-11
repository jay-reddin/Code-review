import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Code-review/',  // <<---- add this
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
