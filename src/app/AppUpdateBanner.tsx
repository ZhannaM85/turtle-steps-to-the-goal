import { useTranslation } from '@/i18n'
import { useAppUpdateAvailable } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'

/**
 * Non-intrusive "a new version is available" prompt (#115) — the only way
 * to know a newer deploy exists today, since there's no service worker and
 * no pull-to-refresh in the iOS home-screen standalone context (a pull-down
 * gesture there has no Safari chrome to catch it and does nothing).
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
