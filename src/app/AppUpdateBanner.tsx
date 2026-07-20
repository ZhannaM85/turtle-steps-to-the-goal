import { useTranslation } from '@/i18n'
import { useAppUpdateAvailable } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'

// Bounded wait for the SW to actually take over before reloading (below) —
// most real updates finish well within this, but there's no guarantee
// (e.g. a slow connection re-downloading the ~2MB precache), and nothing
// fires `controllerchange` at all when the check below turns up nothing
// new. Either way this must not hang the Reload button forever.
const CONTROLLER_CHANGE_TIMEOUT_MS = 5000

/**
 * #205: a plain `window.location.reload()` here could silently do nothing
 * — `useAppUpdateAvailable`'s `version.json` poll runs on its own 5-minute
 * timer, completely independent of the service worker's own update check
 * (#163, `registerType: 'autoUpdate'`), which the browser otherwise only
 * runs on its own schedule (roughly every 24h, or on a fresh navigation).
 * If the SW hasn't yet re-fetched and installed the new version by the
 * time this banner appears, a reload just re-serves whatever the
 * currently-active SW already has cached — same content, banner
 * reappears, "Reload" looks broken.
 *
 * `registration.update()` forces that check right now instead of waiting
 * on the browser's own timer (we already know from version.json there's
 * something to find). Confirmed against the actual generated `dist/sw.js`
 * (`registerType: 'autoUpdate'` bakes `self.skipWaiting()` +
 * `clientsClaim()` directly into the worker's own top-level code, not
 * behind a message listener) that a new worker activates and claims
 * open clients on its own the moment it installs — there's no separate
 * "waiting" worker to explicitly message, unlike a `registerType:
 * 'prompt'` setup. So the only real gap to close here is *timing*: giving
 * that automatic activation a bounded window to finish (signaled by
 * `controllerchange`) before reloading, so the reload has an actual new
 * worker in control by the time it happens instead of racing it.
 */
async function reloadForUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
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
  } catch {
    // Best effort — still reload below even if any of the above failed.
  }
  window.location.reload()
}

/**
 * Non-intrusive "a new version is available" prompt (#115) — the primary
 * way to know a newer deploy exists, and to actually load it, since
 * there's no pull-to-refresh in the iOS home-screen standalone context (a
 * pull-down gesture there has no Safari chrome to catch it and does
 * nothing). #163: the service worker's own autoUpdate registration
 * installs a new version silently in the background, but that alone
 * doesn't refresh what's already rendered — this banner's Reload button is
 * still what actually gets the user onto it, rather than leaving them on
 * stale content until an unrelated reload happens to pick it up.
 */
export function AppUpdateBanner() {
  const t = useTranslation()
  const updateAvailable = useAppUpdateAvailable()

  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-4 py-2 text-sm text-foreground">
      <span>{t.update.availableText}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void reloadForUpdate()}
      >
        {t.update.reloadButton}
      </Button>
    </div>
  )
}
