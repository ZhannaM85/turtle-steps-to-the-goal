import { useEffect, useRef, useState } from 'react'

export interface UseNearViewportOptions {
  /** Extra margin around the viewport before counting as "near". */
  rootMargin?: string
  /**
   * When false, always reports near (e.g. reorder mode needs real
   * section heights). Defaults to true.
   */
  enabled?: boolean
}

/**
 * #538 — sticky near-viewport detection for deferred Dashboard mounts.
 * Once the element has been near the viewport, stays `true` forever so
 * scrolling back does not remount heavy chart trees.
 *
 * Environments without `IntersectionObserver` (jsdom) treat everything
 * as near so unit tests keep rendering full section trees.
 */
export function useNearViewport({
  rootMargin = '400px 0px',
  enabled = true,
}: UseNearViewportOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)
  // Derived — do not setState in an effect when enabled/IO flips
  // (react-hooks/set-state-in-effect). Sticky "seen" lives in state only.
  const alwaysNear = !enabled || typeof IntersectionObserver === 'undefined'
  const [hasIntersected, setHasIntersected] = useState(false)
  const isNear = alwaysNear || hasIntersected

  useEffect(() => {
    if (alwaysNear || hasIntersected) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasIntersected(true)
          observer.disconnect()
        }
      },
      { root: null, rootMargin, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [alwaysNear, rootMargin, hasIntersected])

  return { ref, isNear }
}
