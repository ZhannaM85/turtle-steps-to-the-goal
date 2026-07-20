import { useEffect, useRef, useState } from 'react'
import { reloadForUpdate } from '@/shared/lib/reloadForUpdate'

const PULL_THRESHOLD = 70
const MAX_PULL = 100

/**
 * A real drag-down-to-refresh gesture (#118), since the iOS home-screen
 * standalone context has no Safari chrome to catch a native pull-to-refresh
 * — dragging down there previously did nothing at all, with no feedback.
 * Only activates when the page is already scrolled to the very top
 * (`window.scrollY === 0`) at the moment the touch starts, so it doesn't
 * interfere with normal scrolling or in-page drag gestures (e.g. meal
 * reordering) happening elsewhere on the page. Reaching the pull threshold
 * triggers `reloadForUpdate()` (#211, was a plain `window.location.reload()`
 * — same staleness risk `AppUpdateBanner`'s own Reload button had before
 * #205 fixed it there specifically) so "drag down" gets the same
 * update-aware reload as every other refresh affordance in the app, not
 * just the same *action*. A no-op extra `registration.update()` round trip
 * when there's nothing new to find, which is the common case here since
 * this gesture isn't gated on `useAppUpdateAvailable` the way the banner
 * is — pulling to refresh is a general "start over" gesture, not only an
 * update-actuation one.
 *
 * Gesture-tracking state (start position, in-progress pull distance) lives
 * in refs rather than state, so the effect attaching the listeners only
 * runs once — re-attaching listeners mid-gesture on every pull-distance
 * update would be wasteful and risk subtly dropping events.
 */
export function usePullToRefresh(): {
  pullDistance: number
  isRefreshing: boolean
} {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)
  const currentPull = useRef(0)

  useEffect(() => {
    function onTouchStart(event: TouchEvent) {
      if (window.scrollY > 0) return
      startY.current = event.touches[0].clientY
      pulling.current = true
    }

    function onTouchMove(event: TouchEvent) {
      if (!pulling.current || startY.current === null) return
      const delta = event.touches[0].clientY - startY.current
      if (delta <= 0 || window.scrollY > 0) {
        pulling.current = false
        currentPull.current = 0
        setPullDistance(0)
        return
      }
      // Prevents the native overscroll bounce from fighting the pull
      // indicator visually — only once a genuine downward pull at the top
      // of the page is confirmed, not on every touchmove.
      event.preventDefault()
      const clamped = Math.min(delta, MAX_PULL)
      currentPull.current = clamped
      setPullDistance(clamped)
    }

    function onTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      startY.current = null
      if (currentPull.current >= PULL_THRESHOLD) {
        setIsRefreshing(true)
        void reloadForUpdate()
      } else {
        currentPull.current = 0
        setPullDistance(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return { pullDistance, isRefreshing }
}
