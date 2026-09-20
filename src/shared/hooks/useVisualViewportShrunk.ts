import { useEffect, useState } from 'react'
import { opensKeyboard } from './useIsTextInputFocused'
import {
  STUCK_SHRINK_CLEAR_MS,
  measureVisualViewportBottomGap,
  nextVisualViewportTabBarState,
  stuckViewportRestoreState,
  type VisualViewportTabBarState,
} from './visualViewportTabBar'

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
 * **#973**: do not hide the bar for a shrink with no keyboard involvement
 * (`visualViewport` `scroll` during a finger pan is chrome, not a
 * keyboard). That was hiding the tab bar for the whole gesture and
 * showing it again on touch end.
 */
export function useVisualViewportState(): VisualViewportTabBarState {
  const [state, setState] = useState<VisualViewportTabBarState>({
    isShrunk: false,
    staleBottomGap: 0,
  })

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let stuckClear: ReturnType<typeof setTimeout> | undefined
    let keyboardWasOpen = false
    let latest: VisualViewportTabBarState = {
      isShrunk: false,
      staleBottomGap: 0,
    }

    function assignState(next: VisualViewportTabBarState) {
      latest = next
      setState((prev) =>
        prev.isShrunk === next.isShrunk &&
        prev.staleBottomGap === next.staleBottomGap
          ? prev
          : next,
      )
    }

    function update() {
      const bottomGap = measureVisualViewportBottomGap(
        window.innerHeight,
        viewport,
      )
      const keyboardOpen = opensKeyboard(document.activeElement)
      const next = nextVisualViewportTabBarState({
        bottomGap,
        keyboardOpen,
        keyboardWasOpen,
        previous: latest,
      })
      keyboardWasOpen = next.keyboardWasOpen
      clearTimeout(stuckClear)
      assignState(next.state)
      if (!next.scheduleStuckClear) return
      stuckClear = setTimeout(() => {
        const restored = stuckViewportRestoreState(
          measureVisualViewportBottomGap(window.innerHeight, viewport),
          opensKeyboard(document.activeElement),
        )
        if (restored) {
          keyboardWasOpen = false
          assignState(restored)
        }
      }, STUCK_SHRINK_CLEAR_MS)
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
