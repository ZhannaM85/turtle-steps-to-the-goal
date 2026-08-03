import type { ReactNode } from 'react'
import { useNearViewport } from '@/shared/hooks'

/**
 * #538 — delay mounting heavy Dashboard section trees (Recharts) until
 * they are near the viewport. Above-the-fold / forced sections pass
 * `eager` so the first paint still shows real charts immediately.
 */
export function DeferredMount({
  children,
  eager = false,
  force = false,
  placeholderClassName = 'min-h-48 rounded-lg border border-border bg-muted/20',
}: {
  children: ReactNode
  /** Mount immediately (first sections above the fold). */
  eager?: boolean
  /** Mount immediately regardless of viewport (e.g. reorder mode). */
  force?: boolean
  placeholderClassName?: string
}) {
  const { ref, isNear } = useNearViewport({ enabled: !eager && !force })
  const shouldRender = eager || force || isNear

  return (
    <div ref={ref}>
      {shouldRender ? (
        children
      ) : (
        <div className={placeholderClassName} aria-hidden="true" />
      )}
    </div>
  )
}
