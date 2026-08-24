import { Capacitor } from '@capacitor/core'

/**
 * #310 — replicates vite-plugin-pwa's default auto-injected registration
 * (previously `injectRegister: 'auto'`, now `false` in `vite.config.ts` so
 * this can guard it) but skips it entirely inside the native shell: all
 * app-shell assets are already bundled into the native app (no network
 * fetch needed for a cold or offline load there), so the service worker's
 * offline-precache value is fully redundant, and registering it anyway
 * would just re-precache ~3.8MB into the WebView's own Cache Storage for
 * no benefit. `useAppUpdateAvailable` also explicitly skips on native
 * (its own guard) — updates come from the Play/App Store, not a page
 * reload.
 *
 * #760 — also register when `document.readyState` is already `complete`
 * (a `load` listener would never fire), and pass `updateViaCache: 'none'`.
 * Workbox `skipWaiting`/`clientsClaim` live in `vite.config.ts` so the
 * generated `sw.js` actually takes control (the auto-injected helper used
 * to do that; this file did not).
 */
export function registerServiceWorker() {
  if (Capacitor.isNativePlatform()) return
  if (!('serviceWorker' in navigator)) return

  const register = () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      // #760 — GitHub Pages can keep serving a cached sw.js; never let
      // the HTTP cache decide whether a new worker is even fetched.
      updateViaCache: 'none',
    })
  }

  // #760: `load` may already have fired by the time this module runs
  // (bfcache restore, or a complete document). Waiting for another load
  // would skip registration — iOS standalone then has no controlling
  // worker and shows a blank white screen when offline.
  if (document.readyState === 'complete') {
    register()
    return
  }
  window.addEventListener('load', register, { once: true })
}
