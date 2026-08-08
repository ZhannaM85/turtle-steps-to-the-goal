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
 */
export function registerServiceWorker() {
  if (Capacitor.isNativePlatform()) return
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
  })
}
