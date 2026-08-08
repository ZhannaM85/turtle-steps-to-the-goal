/**
 * #649 — the previous approach (`registration.update()` + wait for
 * `controllerchange`) trusted the existing service worker to gracefully
 * self-update, which depends on GitHub Pages' CDN actually serving fresh
 * `sw.js` bytes on that specific request. Reported live: the banner (and
 * therefore this function) only ever fires once `useAppUpdateAvailable`'s
 * separate `version.json` check (a real, always-uncached network fetch)
 * has already confirmed a newer deploy exists — so there's no reason left
 * to be gentle about it. Unregistering every service worker and clearing
 * every cache guarantees the reload that follows is a genuine, fully-fresh
 * network fetch with no stale precache or stuck-mid-update worker able to
 * intercept it, regardless of what the CDN does with `sw.js` specifically.
 * `registerServiceWorker()` (`main.tsx`) re-registers a fresh worker for
 * whatever's actually live once the new page loads.
 */
export async function reloadForUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    // Best effort — still reload below even if any of the above failed.
  }
  window.location.reload()
}
