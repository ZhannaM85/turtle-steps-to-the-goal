import { useEffect, useState } from 'react'
import { elapsedParts, type ElapsedParts } from '@/domain/stats/lastMealInstant'

/**
 * #791 — elapsed wall-clock from `from` while the tab is visible.
 * Ticks every second only when `document.hidden` is false. On wake
 * (`visibilitychange`, `pageshow`, `focus`) recomputes from `from`
 * rather than accumulating a frozen interval.
 */
export function useElapsedSince(
  from: Date | null,
  active: boolean,
): ElapsedParts | null {
  const fromMs = from?.getTime() ?? null
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!active || fromMs == null) return

    function sync() {
      setNowMs(Date.now())
    }

    let intervalId: ReturnType<typeof setInterval> | null = null

    function startTicking() {
      sync()
      intervalId = setInterval(sync, 1000)
    }

    function stopTicking() {
      if (intervalId == null) return
      clearInterval(intervalId)
      intervalId = null
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopTicking()
        return
      }
      if (intervalId == null) startTicking()
      else sync()
    }

    if (typeof document === 'undefined' || !document.hidden) {
      startTicking()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', sync)
    window.addEventListener('focus', sync)

    return () => {
      stopTicking()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('focus', sync)
    }
  }, [active, fromMs])

  if (!active || from == null) return null
  return elapsedParts(from, new Date(nowMs))
}
