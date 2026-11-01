import { createHash } from 'node:crypto'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// ACCESS_CODES=code1,code2 turns on the lock screen. Only salted SHA-256 hashes
// reach the bundle (see src/access.js, which must hash the same way).
function accessCodeHashes(mode) {
  const { ACCESS_CODES = '' } = loadEnv(mode, process.cwd(), '')
  return ACCESS_CODES.split(',')
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)
    .map((code) => createHash('sha256').update(`spendwise:${code}`).digest('hex'))
}

export default defineConfig(({ mode }) => ({
  envPrefix: ['VITE_', 'SUPABASE_'],
  define: {
    __ACCESS_CODE_HASHES__: JSON.stringify(accessCodeHashes(mode)),
  },
  // The on-device AI worker uses dynamic import(), which needs ES-module workers
  worker: {
    format: 'es',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons come from scripts/generate-icons.cjs
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'SpendWise — Personal Expense Tracker',
        short_name: 'SpendWise',
        description: 'Track your daily income and expenses, generate reports, and stay on top of your finances.',
        theme_color: '#0e0f0c',
        background_color: '#f5f5f2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'utilities'],
        // Android lists the installed app in the Share menu, so a bank SMS can be
        // shared straight in; it arrives as /?text=… (see takeSharedText in App.jsx)
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // transformers.js + ONNX runtime for on-device voice/category models
            // (the model weights themselves are cached by transformers.js)
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-runtime-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
}))
