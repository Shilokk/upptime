import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type PluginOption } from 'vite'

// VITE_HTTPS=1 enables a self-signed certificate so a phone on the same
// network gets a secure context (camera, GPS, speech and PWA install need it).
const useHttps = process.env.VITE_HTTPS === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    useHttps ? (basicSsl() as PluginOption) : null,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'EcoBuddi',
        short_name: 'EcoBuddi',
        description: 'Photograph a plant, get an AI identification with a confidence score, and turn it into survey-grade data.',
        theme_color: '#f7f3e6',
        background_color: '#f7f3e6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education', 'science'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-css' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-files', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
          { urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i, handler: 'CacheFirst', options: { cacheName: 'osm-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 } } },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    // dev server is reachable from phones on the LAN and through tunnels (cloudflared, localtunnel, ngrok)
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
