import { useEffect, useState } from 'react'
import { opensKeyboard } from './useIsTextInputFocused'

/**
 * How long a viewport can keep reporting "shrunk" with no keyboard-focused
 * field before we treat it as a stuck signal (#546). Covers iOS PWA cases
 * where `visualViewport` never fires a full-height resize after the
 * keyboard or native date picker dismisses.
 */
const STUCK_SHRINK_CLEAR_MS = 700

/**
 * Whether the visual viewport is currently shorter than the layout
 * viewport — i.e. an on-screen keyboard (or similar interactive widget)
 * is open or still mid-animation (#188). A more direct, continuously-
 * updating signal than tracking DOM focus alone (`useIsTextInputFocused`):
 * focus/blur fire the instant an element gains/loses focus, but on iOS
 * Safari the actual viewport resize is an animated transition that can
 * lag behind by a couple hundred ms either way, during which a
 * `position: fixed` element can still render at the wrong spot even
 * though nothing has DOM focus anymore. Reasoned from the mechanism, not
 * confirmed live — same "not practically verifiable without a real
 * device" caveat #120 (which this widens, not replaces) already carries.
 * No-ops (always `false`) wherever `window.visualViewport` doesn't exist.
 *
 * **#546**: if the viewport stays shrunk with nothing keyboard-focused,
 * clear after `STUCK_SHRINK_CLEAR_MS` so the tab bar cannot stick hidden.
 * **#970**: preserve the stale viewport's bottom gap when clearing so
 * AppShell can compensate for WebKit positioning fixed content against
 * that stale viewport instead of the full layout viewport.
 */
export function useVisualViewportState(): {
  isShrunk: boolean
  staleBottomGap: number
} {
  const [state, setState] = useState({
    isShrunk: false,
    staleBottomGap: 0,
  })

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let stuckClear: ReturnType<typeof setTimeout> | undefined

    function update() {
      // A little slack, not a strict inequality — sub-pixel/rounding
      // differences between the two measurements shouldn't count as a
      // real shrink.
      const bottomGap = Math.max(
        0,
        window.innerHeight - viewport!.height - viewport!.offsetTop,
      )
      const shrunk = bottomGap > 1
      clearTimeout(stuckClear)
      if (!shrunk) {
        setState({ isShrunk: false, staleBottomGap: 0 })
        return
      }
      setState({ isShrunk: true, staleBottomGap: 0 })
      if (!opensKeyboard(document.activeElement)) {
        stuckClear = setTimeout(() => {
          const currentBottomGap = Math.max(
            0,
            window.innerHeight - viewport!.height - viewport!.offsetTop,
          )
          if (currentBottomGap > 1 && !opensKeyboard(document.activeElement)) {
            setState({
              isShrunk: false,
              staleBottomGap: currentBottomGap,
            })
          }
        }, STUCK_SHRINK_CLEAR_MS)
      }
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    window.addEventListener('pageshow', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearTimeout(stuckClear)
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      window.removeEventListener('pageshow', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return state
}
