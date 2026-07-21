import { useEffect, useState } from 'react'

const NON_KEYBOARD_INPUT_TYPES = new Set([
  'button',
  'submit',
  'checkbox',
  'radio',
  'range',
  'file',
  'color',
  'reset',
  'image',
])

function opensKeyboard(el: Element | null): boolean {
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') {
    return !NON_KEYBOARD_INPUT_TYPES.has((el as HTMLInputElement).type)
  }
  return false
}

// #262: root-caused via a live event trace (Playwright), not guessed — a
// first attempt that only deferred the `focusout` handler still failed,
// because `focusin` *also* directly sets state, synchronously, with no
// deferral of its own. Focusing a text input fires `focusin` with that
// input as the new `document.activeElement` (correctly hides the bar,
// fine — no race risk from hiding something). But clicking a **non-text**
// control (e.g. a ToggleGroupItem `<button>`) right after a text input
// also fires `focusin` — for the button, which just received focus as a
// side effect of being clicked — and `opensKeyboard(button)` is `false`,
// so the old code called `setIsFocused(false)` immediately, synchronously,
// *before* that same click's `pointerup`/`mouseup` had even been
// dispatched. The traced sequence on a real click: pointerdown/mousedown
// hit the button correctly → focusout (old input) → **focusin (new
// button) synchronously flips state, React re-renders the tab bar back
// in** → pointerup/mouseup/click land on the tab bar instead, since it now
// occupies that screen position. Fix: only the *transition into* a
// keyboard-opening element is safe to apply immediately (hiding the bar
// can never steal a click). Any transition *out* of one — whether
// signaled by `focusout` (focus left with nowhere else landing yet) or by
// `focusin` on a non-keyboard element (focus landed somewhere else
// entirely) — waits for the current gesture's own `pointerup` before
// applying, so the bar can't reappear mid-gesture no matter which event
// happens to report the change first. A blur/focus change with no pointer
// involved at all (Tab key, a programmatic `.blur()`) falls back to a
// short fixed delay instead, since there's no gesture to wait out.
const FOCUS_SETTLE_FALLBACK_DELAY_MS = 100

/**
 * Whether a text-entry control (an `<input>` that isn't a button/checkbox/
 * etc., or a `<textarea>`) currently has focus — i.e. the on-screen
 * keyboard is likely open (#120). `focusin`/`focusout` on `document` both
 * re-check `document.activeElement` directly (rather than trusting the
 * event's own target) — see #262 above for why leaving *and* entering
 * both need to run through the same gesture-aware settle logic.
 */
export function useIsTextInputFocused(): boolean {
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    let settled = true
    let fallback: ReturnType<typeof setTimeout> | undefined
    function settle() {
      settled = true
      document.removeEventListener('pointerup', settle)
      clearTimeout(fallback)
      setIsFocused(opensKeyboard(document.activeElement))
    }
    function handleFocusChange() {
      // Cancel whatever the previous focus change was still waiting on —
      // only the most recent one matters.
      if (!settled) {
        settled = true
        document.removeEventListener('pointerup', settle)
        clearTimeout(fallback)
      }
      if (opensKeyboard(document.activeElement)) {
        setIsFocused(true)
        return
      }
      settled = false
      fallback = setTimeout(settle, FOCUS_SETTLE_FALLBACK_DELAY_MS)
      document.addEventListener('pointerup', settle, { once: true })
    }
    document.addEventListener('focusin', handleFocusChange)
    document.addEventListener('focusout', handleFocusChange)
    return () => {
      document.removeEventListener('focusin', handleFocusChange)
      document.removeEventListener('focusout', handleFocusChange)
      document.removeEventListener('pointerup', settle)
      clearTimeout(fallback)
    }
  }, [])

  return isFocused
}
