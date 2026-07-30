import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textarea } from './textarea'

// jsdom never computes real layout, so scrollHeight is always 0 regardless
// of content -- stubbing it to depend on the element's own value length is
// the only way to meaningfully assert on the resize-on-mount behavior here,
// same reasoning this repo already documents elsewhere for chart-internal
// rendering that jsdom can't simulate.
function stubScrollHeight(el: HTMLTextAreaElement) {
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get() {
      return 20 + this.value.length
    },
  })
}

describe('Textarea', () => {
  it('resizes to fit a value already set by a forwarded ref (#449)', () => {
    // Mirrors how react-hook-form's register() ref works for an
    // uncontrolled field: it sets el.value itself, inside the ref
    // callback, since there's no React `value` prop doing it.
    const longValue = 'a'.repeat(100)
    let element: HTMLTextAreaElement | null = null

    render(
      <Textarea
        ref={(el) => {
          if (!el) return
          stubScrollHeight(el)
          el.value = longValue
          element = el
        }}
      />,
    )

    expect(element).not.toBeNull()
    expect(element!.style.height).toBe(`${20 + longValue.length}px`)
  })

  it('resizes to fit an empty value when nothing is set by the forwarded ref', () => {
    let element: HTMLTextAreaElement | null = null

    render(
      <Textarea
        ref={(el) => {
          if (!el) return
          stubScrollHeight(el)
          element = el
        }}
      />,
    )

    expect(element).not.toBeNull()
    expect(element!.style.height).toBe('20px')
  })
})
