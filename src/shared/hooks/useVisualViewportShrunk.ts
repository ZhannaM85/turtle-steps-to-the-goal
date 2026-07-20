import { useEffect, useState } from 'react'

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
 */
export function useVisualViewportShrunk(): boolean {
  const [isShrunk, setIsShrunk] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    function update() {
      // A little slack, not a strict inequality — sub-pixel/rounding
      // differences between the two measurements shouldn't count as a
      // real shrink.
      setIsShrunk(window.innerHeight - viewport!.height > 1)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return isShrunk
}
