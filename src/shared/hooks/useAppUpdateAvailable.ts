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
 * under the GitHub Pages subpath deploy.
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
