import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '..');
  const frontendDir = __dirname;

  // Load env from both root (monorepo) and frontend directory, plus process.env
  const rootEnv = loadEnv(mode, rootDir, '');
  const frontendEnv = loadEnv(mode, frontendDir, '');
  const env = { ...rootEnv, ...frontendEnv, ...process.env };

  const googleClientId =
    env.VITE_GOOGLE_CLIENT_ID ||
    env.GOOGLE_CLIENT_ID ||
    '';

  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    (mode === 'development' ? 'http://127.0.0.1:8000/api/v1' : '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
