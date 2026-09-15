import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import 'flag-icons/css/flag-icons.min.css'
import './i18n/config'
import { queryClient } from './lib/queryClient'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { warmMapResources } from './lib/mapWarmup'
import App from './App.tsx'

// A freshly deployed SPA may drop hashed chunks that an already-open tab still
// references. Vite emits `vite:preloadError` when it can't fetch one of those
// chunks — instead of stranding the user on a crashed route, reload once so
// they pick up the new index.html manifest. Guarded so it can never loop.
if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
  const CHUNK_RELOAD_KEY = 'expedition.chunkReloaded'
  window.addEventListener('vite:preloadError', ((event: Event) => {
    ;(event as { preventDefault?: () => void }).preventDefault?.()
    try {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    } catch {
      /* storage unavailable — fall through to a plain reload */
    }
    window.location.reload()
  }) as EventListener)
}

// Light, app-wide map warm-up after first paint: preconnect to the tile host
// and force-cache the style + render worker, so the checkout map never
// cold-starts. The heavy engine preload runs on booking intent only (see
// BookingWidget) — importing mapWarmup keeps maplibre out of the entry chunk.
const warmMaps = () => warmMapResources()
if (typeof window !== 'undefined') {
  const idleCallback = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    }
  ).requestIdleCallback
  if (typeof idleCallback === 'function') {
    idleCallback.call(window, warmMaps, { timeout: 4000 })
  } else {
    window.setTimeout(warmMaps, 2000)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)
