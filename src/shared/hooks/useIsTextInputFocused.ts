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

/**
 * Whether a text-entry control (an `<input>` that isn't a button/checkbox/
 * etc., or a `<textarea>`) currently has focus — i.e. the on-screen
 * keyboard is likely open (#120). `focusin`/`focusout` on `document` both
 * re-check `document.activeElement` directly (rather than trusting the
 * event's own target). `focusout`'s check is deferred a tick — at the
 * moment `focusout` fires on the element losing focus, `activeElement`
 * hasn't necessarily settled onto whatever's gaining it yet, so checking
 * synchronously there could momentarily read "nothing focused" between two
 * inputs and cause a flicker.
 */
export function useIsTextInputFocused(): boolean {
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    function update() {
      setIsFocused(opensKeyboard(document.activeElement))
    }
    function updateDeferred() {
      setTimeout(update, 0)
    }
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', updateDeferred)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', updateDeferred)
    }
  }, [])

  return isFocused
}
