import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Controle Financeiro',
            short_name: 'Controle Financeiro',
            description: 'Controle Financeiro e Investimentos',
            theme_color: '#0f172a',
            background_color: '#f8fafc',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            icons: [
              { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
              { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
              { src: '/icons/maskable-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
          'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
          'import.meta.env.VITE_BRAPI_API_KEY': JSON.stringify(env.BRAPI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
