import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_SCROLLPORT_ID,
  getAppScrollTop,
  isAtRefreshableTop,
  scrollAppToTop,
  setAppScrollTop,
} from './appScroll'

afterEach(() => {
  document.body.replaceChildren()
  window.scrollTo(0, 0)
})

describe('appScroll (#970)', () => {
  it('reads and writes the inner AppShell scrollport when it exists', () => {
    const main = document.createElement('div')
    main.id = APP_SCROLLPORT_ID
    Object.defineProperty(main, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
    document.body.append(main)

    setAppScrollTop(240)
    expect(main.scrollTop).toBe(240)
    expect(getAppScrollTop()).toBe(240)

    scrollAppToTop()
    expect(main.scrollTop).toBe(0)
    expect(getAppScrollTop()).toBe(0)
  })

  it('falls back to window scroll when the inner scrollport is missing', () => {
    let scrollY = 0
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY,
    })
    const originalScrollTo = window.scrollTo
    window.scrollTo = ((...args: unknown[]) => {
      if (typeof args[0] === 'number') {
        scrollY = Number(args[1]) || 0
      }
    }) as typeof window.scrollTo

    try {
      setAppScrollTop(180)
      expect(getAppScrollTop()).toBe(180)
      scrollAppToTop()
      expect(getAppScrollTop()).toBe(0)
    } finally {
      window.scrollTo = originalScrollTo
      Reflect.deleteProperty(window, 'scrollY')
    }
  })

  it('treats a scrolled inner main as not at the refreshable top', () => {
    const main = document.createElement('div')
    main.id = APP_SCROLLPORT_ID
    Object.defineProperty(main, 'scrollTop', {
      configurable: true,
      value: 80,
    })
    document.body.append(main)

    expect(isAtRefreshableTop(document.body)).toBe(false)
  })

  it('treats window.scrollY as not at the refreshable top without a main', () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40,
    })
    try {
      expect(isAtRefreshableTop(document.body)).toBe(false)
    } finally {
      Reflect.deleteProperty(window, 'scrollY')
    }
  })
})
