import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom doesn't implement ResizeObserver; Radix primitives (e.g. Popover) use
// it internally for size measurement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom's scrollTo is defined but only logs "Not implemented" (#185) —
// AppShell calls it on every route change, so `??=` doesn't help here
// (the property already exists, it's just a noisy stub). Tests that need
// to assert on it override/spy window.scrollTo themselves.
window.scrollTo = (() => {}) as typeof window.scrollTo

// jsdom doesn't implement matchMedia; theme code (prefers-color-scheme
// detection) reads it. Defaults to "no match" — tests that need a specific
// match override window.matchMedia themselves.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
