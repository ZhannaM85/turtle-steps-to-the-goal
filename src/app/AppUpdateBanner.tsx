import { useTranslation } from '@/i18n'
import { useAppUpdateAvailable } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'

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
        onClick={() => window.location.reload()}
      >
        {t.update.reloadButton}
      </Button>
    </div>
  )
}
