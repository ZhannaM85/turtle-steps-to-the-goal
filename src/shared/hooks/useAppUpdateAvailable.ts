import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

const CHECK_INTERVAL_MS = 5 * 60 * 1000

/**
 * Polls `version.json` (written fresh by `.github/workflows/deploy-pages.yml`
 * on every deploy with the current commit SHA, #115) and compares it
 * against `__APP_VERSION__` (baked into this bundle at build time, same
 * SHA) to detect a newer deploy. Fails silently on any fetch error — local
 * dev has no `version.json` at all, and a failed check just means no
 * update prompt shows this cycle, not a broken app. `import.meta.env.BASE_URL`
 * (same value `router.tsx`'s `basename` uses) keeps the fetch path correct
 * under the GitHub Pages subpath deploy. #211: once an update is detected,
 * also re-checks the service worker itself on this same interval (see the
 * comment inline below) — the SW's own `sw.js` fetch is subject to
 * whatever caching the CDN applies to it, independent of this endpoint's
 * own `cache: 'no-store'` fetch.
 *
 * #553: skip network/SW work while the tab is hidden (and re-check when
 * the user returns) so backgrounded iOS/PWA sessions don't keep waking for
 * version polls. Interval stays; each tick no-ops when `document.hidden`.
 *
 * #310: never polls at all inside the native shell — `version.json` isn't
 * bundled there so this already 404'd harmlessly before, but an explicit
 * guard makes "no update prompt inside the native app" a real invariant
 * rather than an accident of what happens to be missing from the bundle.
 * The native app updates via the Play/App Store, not a page reload.
 */
export function useAppUpdateAvailable(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    let cancelled = false

    async function check() {
      // #553 — don't fetch or nudge the SW while backgrounded.
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}version.json`,
          { cache: 'no-store' },
        )
        if (!response.ok) return
        const data = (await response.json()) as { version?: string }
        if (!cancelled && data.version && data.version !== __APP_VERSION__) {
          setUpdateAvailable(true)
          // #211: proactively nudge the service worker to re-check for
          // itself too, on this same interval, rather than only ever
          // checking once at click-time (`reloadForUpdate`). GitHub
          // Pages' CDN can cache `sw.js` for a while after a fresh
          // deploy — this app has no way to configure or bypass that
          // from client code — so a single check exactly when Reload is
          // pressed can lose that race. Spreading independent checks out
          // over time (this poll's own cadence) gives it more chances to
          // land after that cache naturally clears, rather than depending
          // entirely on how many times the button gets pressed.
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration()
            await registration?.update()
          }
        }
      } catch {
        // No connectivity, or no version.json at all (local dev) — not
        // worth surfacing as an error, just nothing to report this cycle.
      }
    }

    function onVisibilityChange() {
      if (!document.hidden) void check()
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return updateAvailable
}
