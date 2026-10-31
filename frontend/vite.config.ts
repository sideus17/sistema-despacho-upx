import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'
import { minimal2023Preset } from '@vite-pwa/assets-generator/config'

const BRAND_RED = '#dc2626'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Ícones (Material Symbols + Healthicons) viram componentes React no build: nada é baixado em execução
    Icons({ compiler: 'jsx', jsx: 'react', defaultClass: 'icon' }),
    VitePWA({
      registerType: 'autoUpdate',
      // Ícones (favicon, apple-touch-icon, PWA e maskable) gerados a partir de um único SVG
      pwaAssets: {
        image: 'public/ambulance.svg',
        preset: {
          ...minimal2023Preset,
          maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND_RED } },
          apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND_RED } }
        }
      },
      manifest: {
        name: 'SAMU Despacho',
        short_name: 'SAMU',
        description: 'Despacho de viaturas do SAMU Sorocaba',
        lang: 'pt-BR',
        // Um app só: depois do login, o motorista cai na viatura e o operador na central
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // O motorista usa o celular em pé ou deitado no painel: as duas telas existem
        orientation: 'any',
        theme_color: '#111827',
        background_color: '#ffffff'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Aviso do despacho (Web Push): eventos push e notificationclick em public/push-sw.js
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Estilo, fontes e tiles vetoriais dos mapas: o que já foi visto continua aparecendo sem sinal
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'openfreemap',
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
          // A API fica fora do cache de propósito: dado antigo servido como atual é perigoso.
          // A tela da equipe guarda os últimos dados e avisa quando está sem conexão.
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // MapLibre em pacote próprio: atualizar o app não obriga o celular a baixar o mapa de novo
        manualChunks: { maplibre: ['maplibre-gl'] }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Pelo proxy a chamada é da mesma origem: abre no celular (IP da rede) sem liberar CORS no backend
        configure: proxy => proxy.on('proxyReq', proxyReq => proxyReq.removeHeader('origin'))
      },
      // Supabase local (npm run db:start no backend), quando VITE_SUPABASE_URL=/supabase.
      // Pelo proxy o login funciona também no celular, que não enxerga o 127.0.0.1 deste computador.
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/supabase/, '')
      }
    }
  }
})
