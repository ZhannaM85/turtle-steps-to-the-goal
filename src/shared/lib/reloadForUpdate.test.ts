import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadForUpdate } from './reloadForUpdate'

function stubServiceWorker(registration: unknown) {
  const addEventListener = vi.fn()
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener,
    },
  })
  return addEventListener
}

describe('reloadForUpdate', () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker',
  )
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    }
  })

  it('reloads immediately when there is no service worker registration', async () => {
    stubServiceWorker(null)

    await reloadForUpdate()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  // #270: registration.update() resolving with neither `installing` nor
  // `waiting` set means nothing new was found — there's nothing that will
  // ever fire controllerchange, so waiting out the full timeout here was
  // pure wasted time on every no-op update check.
  it('skips the controllerchange wait entirely when update() finds nothing new', async () => {
    vi.useFakeTimers()
    const addEventListener = stubServiceWorker({
      update: vi.fn().mockResolvedValue(undefined),
      installing: null,
      waiting: null,
    })

    const done = vi.fn()
    reloadForUpdate().then(done)
    await vi.waitFor(() => expect(done).toHaveBeenCalled())

    expect(reload).toHaveBeenCalledTimes(1)
    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('waits for controllerchange (bounded by the timeout) when a new worker is installing', async () => {
    vi.useFakeTimers()
    stubServiceWorker({
      update: vi.fn().mockResolvedValue(undefined),
      installing: {},
      waiting: null,
    })

    const done = vi.fn()
    reloadForUpdate().then(done)
    await vi.advanceTimersByTimeAsync(0)
    expect(done).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)
    await vi.waitFor(() => expect(done).toHaveBeenCalled())
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads even if registration.update() throws', async () => {
    stubServiceWorker({
      update: vi.fn().mockRejectedValue(new Error('network error')),
      installing: null,
      waiting: null,
    })

    await reloadForUpdate()

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
