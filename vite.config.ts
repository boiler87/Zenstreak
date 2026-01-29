
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Using root base path is standard for custom domains (e.g. https://app.com/)
    base: '/', 
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || "")
    }
  };
});