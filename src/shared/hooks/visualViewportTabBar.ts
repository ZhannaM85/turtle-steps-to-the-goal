export const VIEWPORT_SHRINK_PX = 1

/**
 * How long a viewport can keep reporting "shrunk" with no keyboard-focused
 * field before we treat it as a stuck signal (#546). Covers iOS PWA cases
 * where `visualViewport` never fires a full-height resize after the
 * keyboard or native date picker dismisses.
 */
export const STUCK_SHRINK_CLEAR_MS = 700

export type VisualViewportTabBarState = {
  isShrunk: boolean
  staleBottomGap: number
}

export function measureVisualViewportBottomGap(
  innerHeight: number,
  viewport: { height: number; offsetTop: number } | null | undefined,
): number {
  if (!viewport) return 0
  return Math.max(0, innerHeight - viewport.height - viewport.offsetTop)
}

/**
 * Decide whether the bottom tab bar should hide, and whether a stale
 * visual-viewport gap should later be compensated.
 *
 * **#188 / #120**: hide only while a soft keyboard is open or still
 * animating closed (`keyboardWasOpen` after blur).
 * **#973**: a shrink with no keyboard involvement is scroll/chrome, not a
 * keyboard — keep the bar visible (do not treat `visualViewport` `scroll`
 * as hide-on-scroll).
 * **#970**: if that no-keyboard shrink lasts, the hook applies
 * `staleBottomGap` after `STUCK_SHRINK_CLEAR_MS` so AppShell can translate
 * the restored bar to the layout bottom.
 */
export function nextVisualViewportTabBarState(input: {
  bottomGap: number
  keyboardOpen: boolean
  keyboardWasOpen: boolean
  previous: VisualViewportTabBarState
}): {
  state: VisualViewportTabBarState
  keyboardWasOpen: boolean
  scheduleStuckClear: boolean
} {
  const shrunk = input.bottomGap > VIEWPORT_SHRINK_PX

  if (!shrunk) {
    return {
      state: { isShrunk: false, staleBottomGap: 0 },
      keyboardWasOpen: input.keyboardOpen,
      scheduleStuckClear: false,
    }
  }

  if (input.keyboardOpen || input.keyboardWasOpen) {
    return {
      state: { isShrunk: true, staleBottomGap: 0 },
      keyboardWasOpen: true,
      scheduleStuckClear: !input.keyboardOpen,
    }
  }

  return {
    state: {
      isShrunk: false,
      staleBottomGap: input.previous.staleBottomGap,
    },
    keyboardWasOpen: false,
    scheduleStuckClear: input.previous.staleBottomGap === 0,
  }
}

export function stuckViewportRestoreState(
  bottomGap: number,
  keyboardOpen: boolean,
): VisualViewportTabBarState | null {
  if (bottomGap > VIEWPORT_SHRINK_PX && !keyboardOpen) {
    return { isShrunk: false, staleBottomGap: bottomGap }
  }
  return null
}
