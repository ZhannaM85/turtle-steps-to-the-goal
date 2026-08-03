import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeferredMount } from './DeferredMount'

describe('DeferredMount (#538)', () => {
  const OriginalIO = globalThis.IntersectionObserver

  afterEach(() => {
    if (OriginalIO) {
      globalThis.IntersectionObserver = OriginalIO
    } else {
      // @ts-expect-error — jsdom has no IntersectionObserver
      delete globalThis.IntersectionObserver
    }
  })

  it('renders children immediately when IntersectionObserver is missing', () => {
    // @ts-expect-error — match production jsdom
    delete globalThis.IntersectionObserver
    render(
      <DeferredMount>
        <span>chart body</span>
      </DeferredMount>,
    )
    expect(screen.getByText('chart body')).toBeInTheDocument()
  })

  it('renders children immediately when eager', () => {
    let callback: IntersectionObserverCallback | undefined
    globalThis.IntersectionObserver = vi.fn((cb) => {
      callback = cb
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: () => [],
      }
    }) as unknown as typeof IntersectionObserver

    render(
      <DeferredMount eager>
        <span>eager chart</span>
      </DeferredMount>,
    )
    expect(screen.getByText('eager chart')).toBeInTheDocument()
    void callback
  })

  it('renders children immediately when forced', () => {
    globalThis.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    })) as unknown as typeof IntersectionObserver

    render(
      <DeferredMount force>
        <span>forced chart</span>
      </DeferredMount>,
    )
    expect(screen.getByText('forced chart')).toBeInTheDocument()
  })

  it('shows a placeholder until near the viewport, then mounts children', () => {
    let callback: IntersectionObserverCallback | undefined
    const disconnect = vi.fn()
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = disconnect
      takeRecords = () => []
      root = null
      rootMargin = ''
      thresholds = []
    }
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver

    render(
      <DeferredMount>
        <span>lazy chart</span>
      </DeferredMount>,
    )
    expect(screen.queryByText('lazy chart')).not.toBeInTheDocument()

    act(() => {
      callback?.(
        [
          {
            isIntersecting: true,
            target: document.createElement('div'),
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      )
    })
    expect(screen.getByText('lazy chart')).toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })
})
