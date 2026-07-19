import { useTranslation } from '@/i18n'
import { useOnlineStatus } from '@/shared/hooks'

/**
 * Quiet "you're offline" indicator (#163) — reassurance, not a blocker: the
 * app stays fully usable offline (all data is IndexedDB-local, the service
 * worker precaches the app shell), so this mainly exists to explain why
 * `AppUpdateBanner`'s update check never fires while offline.
 */
export function OfflineBanner() {
  const t = useTranslation()
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="border-b border-border bg-muted px-4 py-2 text-sm text-foreground">
      {t.offline.offlineText}
    </div>
  )
}
