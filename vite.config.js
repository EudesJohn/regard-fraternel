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
        theme_color: '#191243',
        background_color: '#fbf8f2',
        display: 'standalone',
        lang: 'fr',
        icons: [
          { src: '/logo.png', sizes: '2160x2160', type: 'image/png' }
        ]
      },
      workbox: {
        // ⚠️ PAS de navigateFallback et PAS de HTML dans le precache : la
        // navigation (history mode, URLs propres) doit TOUJOURS charger
        // index.html depuis le réseau (jamais une version obsolète en cache
        // après un redéploiement — cause des boutons de navigation morts).
        // Les photos du site (~26 Mo) ne sont PAS précachées : elles passent par
        // le runtime caching ci-dessous (cache à la première visite).
        globPatterns: ['**/*.{js,css,ico,woff2}', '**/logo.png', '**/logo-light.png'],
        // L'admin (dist/admin) n'est jamais précachée dans le service worker
        // public : ses fichiers sont protégés par la porte /admin (middleware).
        globIgnores: ['**/admin/**'],
        // Désactive le fallback de navigation du precache (CacheFirst sur
        // index.html) : le plugin en met un par défaut.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Pages : réseau d'abord, cache en secours → la navigation reste
            // toujours fonctionnelle après chaque mise à jour du site
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 4
            }
          },
          {
            // Photos locales du site (public/images) — cache à la première visite
            urlPattern: /\/images\/.*\.(png|jpe?g|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'site-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
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
  // Base absolue : le site est servi à la racine du domaine, et le routeur
  // utilise le history mode (URLs propres, sans #). Les assets (/assets/...)
  // sont servis tels quels grâce aux rewrites de vercel.json.
  base: '/',
  server: {
    open: false,
    port: 5173
  }
})
