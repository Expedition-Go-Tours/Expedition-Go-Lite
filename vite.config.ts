import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// mapbox-gl's ESM worker (`dist/esm/worker.js`) must be served VERBATIM with
// its whole module closure: Vite's production build rewrites its `?url` asset
// into a module that statically imports `./shared.js` (and dynamically
// `./raster_array.worker.js`), none of which get emitted — the worker 404s and
// the Mapbox map can't paint tiles (it only appears after the failover
// watchdogs, the "map takes very long to load" on Vercel). Serving the raw
// worker + its shared/worker chunks from `public/` keeps every relative import
// resolvable and untransformed in dev and production alike.
function copyMapboxWorker(): Plugin {
  const files = [
    'worker.js',
    'shared.js',
    'hd.worker.js',
    'standard.worker.js',
    'raster_array.worker.js',
    'hd.shared.js',
    'standard.shared.js',
    'hd_standard.model.js',
    'raster_array.shared.js',
  ]
  return {
    name: 'copy-mapbox-worker',
    configResolved() {
      const outDir = resolve(__dirname, 'public/mapbox-gl')
      mkdirSync(outDir, { recursive: true })
      for (const f of files) {
        copyFileSync(resolve(__dirname, 'node_modules/mapbox-gl/dist/esm', f), resolve(outDir, f))
      }
    },
  }
}

// maplibre-gl's worker (`maplibre-gl-worker.mjs`) is a MODULE worker that
// imports its shared chunk (`./maplibre-gl-shared.mjs`). Vite's `?url` import
// copies the worker into dist/assets/ verbatim but never emits that relative
// chunk next to it, so on the deployed build the worker fails to boot and the
// map can't parse tiles — it hangs until the failover watchdogs (the "map
// takes very long to load" on Vercel). Serving the worker + its shared chunk
// raw from `public/` keeps the relative import resolvable in dev and prod.
function copyMaplibreWorker(): Plugin {
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']
  return {
    name: 'copy-maplibre-worker',
    configResolved() {
      const outDir = resolve(__dirname, 'public/maplibre-gl')
      mkdirSync(outDir, { recursive: true })
      for (const f of files) {
        copyFileSync(resolve(__dirname, 'node_modules/maplibre-gl/dist', f), resolve(outDir, f))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    copyMapboxWorker(),
    copyMaplibreWorker(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,webp,png,jpg,svg,ttf,otf,ico}'],
        runtimeCaching: [
          {
            // Tour detail freshness matters: the storefront relies on the
            // API's productContent (itinerary/locations, pricing, availability)
            // reflecting the supplier's latest edits. StaleWhileRevalidate
            // could serve a cached payload captured before locations were
            // saved, hiding the itinerary. NetworkFirst hits the network first
            // (fresh data) and only falls back to cache when offline/failing.
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            // Cache all CDN-served images (Cloudinary tour photos,
            // Unsplash fallbacks, Google UserContent profile photos).
            // CacheFirst: once downloaded, serve from disk for 30 days.
            // This prevents images from re-downloading on every scroll.
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname === 'res.cloudinary.com' ||
              url.hostname === 'images.unsplash.com' ||
              url.hostname.endsWith('.googleusercontent.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Expedition-Go Tours',
        short_name: 'Expedition-Go',
        description: 'Discover and book amazing tours worldwide',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/src/assets/icons/compyIcon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/src/assets/icons/compyIcon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // maplibre-gl spawns its render worker via `new URL('./maplibre-gl-worker.mjs',
    // import.meta.url)`; pre-bundling would resolve it inside .vite/deps where
    // the worker is never emitted, leaving every map blank in dev. Serving the
    // package un-bundled keeps that URL pointing at the real worker file.
    // mapbox-gl's ESM build does the same with its `worker.js` chunk.
    exclude: ['maplibre-gl', 'mapbox-gl'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) return 'vendor-ui'
          if (id.includes('node_modules/@tanstack/react-query') || id.includes('node_modules/zustand')) return 'vendor-data'
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'vendor-i18n'
        },
      },
    },
  },
})
