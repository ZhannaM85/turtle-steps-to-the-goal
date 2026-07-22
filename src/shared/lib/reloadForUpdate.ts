// Bounded wait for the SW to actually take over before reloading (below) —
// most real updates finish well within this, but there's no guarantee
// (e.g. a slow connection re-downloading the ~2MB precache), and nothing
// fires `controllerchange` at all when the check below turns up nothing
// new. Either way this must not hang the caller forever.
const CONTROLLER_CHANGE_TIMEOUT_MS = 5000

/**
 * #205: a plain `window.location.reload()` could silently do nothing —
 * `useAppUpdateAvailable`'s `version.json` poll runs on its own 5-minute
 * timer, completely independent of the service worker's own update check
 * (#163, `registerType: 'autoUpdate'`), which the browser otherwise only
 * runs on its own schedule (roughly every 24h, or on a fresh navigation).
 * If the SW hasn't yet re-fetched and installed the new version, a reload
 * just re-serves whatever the currently-active SW already has cached —
 * same content, looking like nothing happened.
 *
 * `registration.update()` forces that check right now instead of waiting
 * on the browser's own timer (we already know from version.json there's
 * something to find). Confirmed against the actual generated `dist/sw.js`
 * (`registerType: 'autoUpdate'` bakes `self.skipWaiting()` +
 * `clientsClaim()` directly into the worker's own top-level code, not
 * behind a message listener) that a new worker activates and claims open
 * clients on its own the moment it installs — there's no separate
 * "waiting" worker to explicitly message, unlike a `registerType:
 * 'prompt'` setup. So the remaining gap to close here is *timing*: giving
 * that automatic activation a bounded window to finish (signaled by
 * `controllerchange`) before reloading, so the reload has an actual new
 * worker in control by the time it happens instead of racing it.
 *
 * #211: even with this, a real device could still need several presses —
 * `registration.update()`'s own fetch of `sw.js` is subject to whatever
 * caching GitHub Pages' CDN applies to that file, which this app has no
 * way to configure or bypass from client code. `useAppUpdateAvailable`
 * mitigates this by proactively re-checking in the background on the same
 * interval as its own `version.json` poll, once it knows an update
 * exists — by the time this function runs (a button press or a
 * pull-to-refresh gesture), there's a much better chance a recent
 * background check already found and activated the new worker, rather
 * than this being the only check that's ever run.
 */
export async function reloadForUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        // #270: `update()` resolving doesn't itself say whether a new
        // worker was found — but if one was, the browser has already
        // started installing it by the time `update()` resolves, so
        // `registration.installing`/`.waiting` will be set. When neither
        // is set, there's nothing new for `controllerchange` to ever fire
        // for (GitHub Pages' CDN served the same cached sw.js, per #211's
        // own comment above) — waiting out the full timeout here would
        // only delay the reload for no reason, so skip straight to it.
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
