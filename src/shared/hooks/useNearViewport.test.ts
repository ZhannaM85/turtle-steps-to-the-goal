import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNearViewport } from './useNearViewport'

describe('useNearViewport (#538)', () => {
  const OriginalIO = globalThis.IntersectionObserver

  afterEach(() => {
    if (OriginalIO) {
      globalThis.IntersectionObserver = OriginalIO
    } else {
      // @ts-expect-error — jsdom has no IntersectionObserver
      delete globalThis.IntersectionObserver
    }
  })

  it('reports near immediately when IntersectionObserver is missing', () => {
    // @ts-expect-error — jsdom-like
    delete globalThis.IntersectionObserver
    const { result } = renderHook(() => useNearViewport())
    expect(result.current.isNear).toBe(true)
  })

  it('reports near immediately when disabled', () => {
    globalThis.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    })) as unknown as typeof IntersectionObserver

    const { result } = renderHook(() => useNearViewport({ enabled: false }))
    expect(result.current.isNear).toBe(true)
  })

  it('starts not-near when IntersectionObserver exists and enabled', () => {
    globalThis.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    })) as unknown as typeof IntersectionObserver

    const { result } = renderHook(() => useNearViewport())
    expect(result.current.isNear).toBe(false)
  })
})
