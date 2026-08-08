// Bounded wait for the SW to actually take over before reloading (below) —
// most real updates finish well within this, but there's no guarantee
// (e.g. a slow connection re-downloading the ~2MB precache), and nothing
// fires `controllerchange` at all when the check below turns up nothing
// new. Either way this must not hang the caller forever.
const CONTROLLER_CHANGE_TIMEOUT_MS = 5000

/**
 * #652 — critical regression from #649's rewrite below: `reloadForUpdate()`
 * had become unconditionally destructive (unregister every SW + clear
 * every cache) regardless of caller, but `usePullToRefresh.ts` calls this
 * on *every* pull gesture by design — "a general 'start over' gesture,
 * not only an update-actuation one" (its own doc comment), never gated on
 * an update actually existing. That meant an ordinary, frequent pull-to-
 * refresh was wiping the app's entire offline-capable precache every
 * time, not just when genuinely needed — reported live as full offline
 * failure ("Safari can't open the page") with no cached app shell left at
 * all. Split into two paths instead of one unconditional one:
 *
 * - `force` (only `AppUpdateBanner.tsx`'s Reload button, which only
 *   renders once `useAppUpdateAvailable` has confirmed an update exists):
 *   #649's nuclear unregister-everything-and-clear-every-cache behavior,
 *   justified there — #649's own root cause (GitHub Pages' CDN can keep
 *   serving a stale `sw.js` indefinitely, so the existing worker may
 *   never self-update no matter how long this waits) is real and
 *   confirmed specifically for "an update genuinely exists but the SW
 *   isn't taking it."
 * - Default (pull-to-refresh, and any future non-update-confirmed
 *   caller): the original #205/#211/#242 gentle behavior — ask the
 *   existing worker to check for an update and wait briefly, but never
 *   destroy what's already cached. A pull-to-refresh with nothing new to
 *   find just reloads on whatever's already precached, offline capability
 *   intact.
 */
export async function reloadForUpdate(
  options: { force?: boolean } = {},
): Promise<void> {
  try {
    if (options.force) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } else if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        // #270: `update()` resolving doesn't itself say whether a new
        // worker was found — but if one was, the browser has already
        // started installing it by the time `update()` resolves, so
        // `registration.installing`/`.waiting` will be set. When neither
        // is set, there's nothing new for `controllerchange` to ever fire
        // for (GitHub Pages' CDN served the same cached sw.js, per #211's
        // own comment) — waiting out the full timeout here would only
        // delay the reload for no reason, so skip straight to it.
        if (registration.installing || registration.waiting) {
          await Promise.race([
            new Promise<void>((resolve) => {
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => resolve(),
                { once: true },
              )
            }),
            new Promise<void>((resolve) =>
              setTimeout(resolve, CONTROLLER_CHANGE_TIMEOUT_MS),
            ),
          ])
        }
      }
    }
  } catch {
    // Best effort — still reload below even if any of the above failed.
  }
  window.location.reload()
}
