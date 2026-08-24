import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

describe('registerServiceWorker (#760)', () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker',
  )
  const originalReadyState = Object.getOwnPropertyDescriptor(
    document,
    'readyState',
  )
  let register: ReturnType<typeof vi.fn>
  let addEventListener: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    })
    addEventListener = vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    }
    if (originalReadyState) {
      Object.defineProperty(document, 'readyState', originalReadyState)
    }
  })

  it('registers immediately when the document is already complete', () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    })

    registerServiceWorker()

    expect(register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      expect.anything(),
    )
  })

  it('waits for load when the document is still loading', () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    })

    registerServiceWorker()

    expect(register).not.toHaveBeenCalled()
    expect(addEventListener).toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      { once: true },
    )

    const listener = addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'load',
    )?.[1] as () => void
    listener()
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('does nothing when service workers are unavailable', () => {
    Reflect.deleteProperty(navigator, 'serviceWorker')

    registerServiceWorker()

    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      expect.anything(),
    )
  })
})
