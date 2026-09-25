import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAddMealManualSheet } from './useAddMealManualSheet'

function renderSheet() {
  return renderHook(() =>
    useAddMealManualSheet({
      locale: 'en',
      isOnline: true,
      onAppendItems: vi.fn(),
      touchMealItem: vi.fn(),
      setSearch: vi.fn(),
    }),
  )
}

describe('openManualAdd dish name (#992)', () => {
  it('prefills the dish name from the search query', () => {
    const { result } = renderSheet()

    act(() => {
      result.current.openManualAdd('  Медово-ореховый пирог  ')
    })

    expect(result.current.isManualOpen).toBe(true)
    expect(result.current.manualDraft.name).toBe('Медово-ореховый пирог')
  })

  it('leaves the dish name blank when opened without a query', () => {
    const { result } = renderSheet()

    act(() => {
      result.current.openManualAdd()
    })

    expect(result.current.isManualOpen).toBe(true)
    expect(result.current.manualDraft.name).toBe('')
  })
})
