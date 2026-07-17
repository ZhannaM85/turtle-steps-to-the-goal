import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { usePullToRefresh } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'

// Kept in sync with usePullToRefresh's own PULL_THRESHOLD — used here only
// to drive the "ready to release" visual cue (full rotation, primary
// color), not to decide whether refreshing actually triggers.
const PULL_THRESHOLD = 70

/**
 * The visible feedback for `usePullToRefresh` (#118) — a small floating
 * badge that rotates in proportion to how far the page has been pulled
 * down, snapping to a spinning state once the threshold is crossed and the
 * page is about to reload. Renders nothing at rest (`pullDistance === 0`),
 * so it stays invisible during normal use.
 */
export function PullToRefreshIndicator() {
  const t = useTranslation()
  const { pullDistance, isRefreshing } = usePullToRefresh()

  if (pullDistance === 0 && !isRefreshing) return null

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const ready = progress >= 1

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[calc(env(safe-area-inset-top)+12px)]"
      aria-hidden={!isRefreshing}
    >
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-border',
          ready || isRefreshing ? 'text-primary' : 'text-muted-foreground',
        )}
        style={{
          opacity: isRefreshing ? 1 : progress,
          transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
        }}
      >
        <RefreshCw
          aria-hidden="true"
          className={cn('size-4', isRefreshing && 'animate-spin')}
        />
      </div>
      {isRefreshing && <span className="sr-only">{t.common.loading}</span>}
    </div>
  )
}
