import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMealItemStore } from '@/stores'
import { blankManualDraft } from './addMealDialogHelpers'
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

describe('homemade catalog flag (#994)', () => {
  it('saves homemade on the dish, not on the meal log line', () => {
    const touchMealItem = vi.fn()
    const onAppendItems = vi.fn()
    const { result } = renderHook(() =>
      useAddMealManualSheet({
        locale: 'ru',
        isOnline: true,
        onAppendItems,
        touchMealItem,
        setSearch: vi.fn(),
      }),
    )

    act(() => {
      result.current.setManualDraft({
        ...blankManualDraft(),
        name: 'Домашний гуляш',
        brand: '',
        amount: '140',
        homemade: true,
      })
    })
    act(() => {
      result.current.saveManualDraft()
    })

    expect(onAppendItems).toHaveBeenCalledTimes(1)
    const logged = onAppendItems.mock.calls[0][0][0]
    expect(logged.name).toBe('Домашний гуляш')
    expect(logged.brand).toBeUndefined()
    expect(logged).not.toHaveProperty('homemade')
    expect(touchMealItem).toHaveBeenCalledWith(
      'Домашний гуляш',
      expect.objectContaining({ amountKcal: 140 }),
      undefined,
      undefined,
      true,
    )
  })

  it('opens an edited dish with the catalog homemade flag', () => {
    useMealItemStore.setState({
      items: [
        {
          id: 'goulash',
          name: 'Домашний гуляш',
          createdAt: '2026-09-25T00:00:00.000Z',
          updatedAt: '2026-09-25T00:00:00.000Z',
          lastAmountKcal: 140,
          homemade: true,
        },
      ],
    })
    const { result } = renderHook(() =>
      useAddMealManualSheet({
        locale: 'ru',
        isOnline: true,
        onAppendItems: vi.fn(),
        touchMealItem: vi.fn(),
        setSearch: vi.fn(),
      }),
    )

    act(() => {
      result.current.startEditItem({
        id: 'line-1',
        name: 'Домашний гуляш',
        amountKcal: 140,
        amountG: 100,
      })
    })

    expect(result.current.manualDraft.homemade).toBe(true)
    expect(result.current.manualDraft.brand).toBe('')
  })
})
