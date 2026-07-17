import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n'

/**
 * Suspense fallback for lazy-loaded routes (#102) — shown briefly while a
 * route's own chunk downloads (Today stays eagerly bundled since it's the
 * default route; every other screen is code-split, see router.tsx). Same
 * spinner language as PullToRefreshIndicator/RouteErrorFallback's siblings,
 * just centered in the content area rather than the whole viewport, since
 * the header/nav around it are already mounted at this point.
 */
export function RouteLoadingFallback() {
  const t = useTranslation()

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2
        aria-hidden="true"
        className="size-6 animate-spin text-muted-foreground"
      />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  )
}
