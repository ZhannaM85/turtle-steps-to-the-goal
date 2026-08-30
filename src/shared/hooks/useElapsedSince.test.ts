import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElapsedSince } from './useElapsedSince'

describe('useElapsedSince (#791)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 30, 15, 0, 0, 0))
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks once per second while visible', () => {
    const from = new Date(2026, 7, 30, 14, 59, 50, 0)
    const { result } = renderHook(() => useElapsedSince(from, true))
    expect(result.current).toEqual({ hours: 0, minutes: 0, seconds: 10 })

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toEqual({ hours: 0, minutes: 0, seconds: 13 })
  })

  it('stops the interval while hidden and recomputes on wake', () => {
    let hidden = false
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    })

    const from = new Date(2026, 7, 30, 14, 0, 0, 0)
    const { result } = renderHook(() => useElapsedSince(from, true))
    expect(result.current?.hours).toBe(1)

    hidden = true
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(result.current).toEqual({ hours: 1, minutes: 0, seconds: 0 })

    hidden = false
    vi.setSystemTime(new Date(2026, 7, 30, 16, 5, 0, 0))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toEqual({ hours: 2, minutes: 5, seconds: 0 })
  })

  it('does not tick when inactive', () => {
    const from = new Date(2026, 7, 30, 14, 0, 0, 0)
    const { result } = renderHook(() => useElapsedSince(from, false))
    expect(result.current).toBeNull()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBeNull()
  })
})
