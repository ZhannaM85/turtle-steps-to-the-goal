import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useAppUpdateAvailable } from '@/shared/hooks'
import { reloadForUpdate } from '@/shared/lib/reloadForUpdate'
import { Button } from '@/shared/ui/button'

/**
 * Non-intrusive "a new version is available" prompt (#115) — the primary,
 * explicitly-discoverable way to know a newer deploy exists and to load
 * it. #118 later added a real pull-to-refresh gesture (`usePullToRefresh`)
 * that also works in the iOS home-screen standalone context (a plain
 * pull-down gesture there has no Safari chrome to catch it on its own) —
 * this banner isn't the only way to reload anymore, but stays as the
 * visible, no-gesture-required affordance; a gesture has no visible
 * call-to-action of its own for someone who doesn't already know to try
 * it. #163: the service worker's own autoUpdate registration installs a
 * new version silently in the background, but that alone doesn't refresh
 * what's already rendered — reloading (here, or via the pull gesture) is
 * still what actually gets the user onto it.
 */
export function AppUpdateBanner() {
  const t = useTranslation()
  const updateAvailable = useAppUpdateAvailable()
  // #242: reloadForUpdate() can take up to several seconds (waiting on the
  // service worker's controllerchange, see its own comment) before the page
  // actually reloads, with no feedback in between — reported as looking
  // broken, prompting repeated clicks. Once clicked, this only ever resolves
  // by a real page reload (or the tab staying open on a genuine failure),
  // never by falling back to the button — nothing to reset it to visible.
  const [reloading, setReloading] = useState(false)

  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-4 py-2 text-sm text-foreground">
      <span>{t.update.availableText}</span>
      {reloading ? (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
          {t.update.reloadingText}
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setReloading(true)
            void reloadForUpdate()
          }}
        >
          {t.update.reloadButton}
        </Button>
      )}
    </div>
  )
}
