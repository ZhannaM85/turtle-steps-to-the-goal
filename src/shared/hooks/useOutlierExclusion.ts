import { useMemo } from 'react'
import { flagOutliers } from '@/domain/stats'
import { useOutlierExclusionStore } from '@/stores'

// Stable reference for the "no exclusions yet" case — a fresh `{}` on every
// selector call would change identity every render, which zustand's
// useSyncExternalStore-based subscription treats as "state changed",
// causing an infinite re-render loop.
const EMPTY_EXCLUDED: Record<string, true> = {}

/**
 * Shared outlier-flagging + tap-to-exclude bookkeeping (#224) for a
 * correlation view's own raw points — reused by all 6 correlation views
 * the same way `CorrelationStrengthLabel.tsx` already is, rather than
 * duplicating this logic per view. Each view still owns its own chart/JSX
 * (this codebase's established "one file per metric, not a generic
 * engine" convention) — only the bookkeeping is shared.
 */
export function useOutlierExclusion<T>(
  viewKey: string,
  points: T[],
  getX: (point: T) => number,
  getY: (point: T) => number,
  getKey: (point: T) => string,
) {
  const excludedForView = useOutlierExclusionStore(
    (state) => state.excluded[viewKey] ?? EMPTY_EXCLUDED,
  )
  const toggleExcludedInStore = useOutlierExclusionStore(
    (state) => state.toggleExcluded,
  )

  const flags = useMemo(
    () => flagOutliers(points, getX, getY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points],
  )

  function isExcluded(point: T): boolean {
    return Boolean(excludedForView[getKey(point)])
  }

  function toggle(point: T): void {
    toggleExcludedInStore(viewKey, getKey(point))
  }

  const includedPoints = points.filter((point) => !isExcluded(point))
  const excludedCount = points.length - includedPoints.length

  return { flags, isExcluded, toggle, includedPoints, excludedCount }
}
