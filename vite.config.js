import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'logo-light.png'],
      manifest: {
        name: 'REGARD FRATERNEL — ONG',
        short_name: 'REGARD FRATERNEL',
        description: "ONG béninoise — Solidarité, Espérance et Amour",
        theme_color: '#0b2a21',
        background_color: '#fbf8f2',
        display: 'standalone',
        lang: 'fr',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            // Images Supabase (bucket photos) — cache 1 an, jamais rechargées si présentes
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/photos\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-photos',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Polices Google
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  base: './',
  server: {
    open: false,
    port: 5173
  }
})
