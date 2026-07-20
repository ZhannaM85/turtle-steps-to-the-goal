import { useEffect, useState } from 'react'

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
 */
export function useAppUpdateAvailable(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
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

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return updateAvailable
}
