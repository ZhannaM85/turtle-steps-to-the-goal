import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLdlImpactStore } from '@/stores'
import { useAddMealManualSheet } from './useAddMealManualSheet'

beforeEach(() => {
  useLdlImpactStore.setState({ enabled: false })
})

function renderSheet(
  touchMealItem = vi.fn(),
  onAppendItems = vi.fn(),
  onUpdateItem = vi.fn(),
) {
  const hook = renderHook(() =>
    useAddMealManualSheet({
      locale: 'ru',
      isOnline: true,
      onAppendItems,
      onUpdateItem,
      touchMealItem,
      setSearch: vi.fn(),
    }),
  )
  return { ...hook, touchMealItem, onAppendItems, onUpdateItem }
}

describe('manual food LDL (#1013)', () => {
  it('starts a new food at unknown with an empty reason', () => {
    const { result } = renderSheet()

    act(() => {
      result.current.openManualAdd('Новый суп')
    })

    expect(result.current.manualDraft.cholesterolImpact).toBe('unknown')
    expect(result.current.manualDraft.cholesterolReason).toBe('')
  })

  it('does not write LDL while the setting is off', () => {
    const touchMealItem = vi.fn()
    const onAppendItems = vi.fn()
    const { result } = renderSheet(touchMealItem, onAppendItems)

    act(() => {
      result.current.openManualAdd('Новый суп')
      result.current.setManualDraft((draft) => ({
        ...draft,
        amount: '80',
        cholesterolImpact: 'high',
        cholesterolReason: 'Не должно сохраниться',
      }))
    })
    act(() => {
      result.current.saveManualDraft()
    })

    const logged = onAppendItems.mock.calls[0][0][0]
    expect(logged.cholesterolImpact).toBeUndefined()
    expect(logged.cholesterolReason).toBeUndefined()
    expect(touchMealItem.mock.calls[0][5]).toBeUndefined()
  })

  it('saves the chosen level and reason on the dish and the catalog food', () => {
    useLdlImpactStore.setState({ enabled: true })
    const touchMealItem = vi.fn()
    const onAppendItems = vi.fn()
    const { result } = renderSheet(touchMealItem, onAppendItems)

    act(() => {
      result.current.openManualAdd('Новый суп')
      result.current.setManualDraft((draft) => ({
        ...draft,
        amount: '80',
        cholesterolImpact: 'limit',
        cholesterolReason: '  Много сыра. ',
      }))
    })
    act(() => {
      result.current.saveManualDraft()
    })

    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Новый суп',
      cholesterolImpact: 'limit',
      cholesterolReason: 'Много сыра.',
    })
    expect(touchMealItem.mock.calls[0][5]).toEqual({
      cholesterolImpact: 'limit',
      cholesterolReason: 'Много сыра.',
    })
  })

  it('opens an edited dish with its stored LDL label', () => {
    const { result } = renderSheet()

    act(() => {
      result.current.startEditItem({
        id: 'line-1',
        name: 'Новый суп',
        amountKcal: 80,
        amountG: 100,
        cholesterolImpact: 'moderate',
        cholesterolReason: 'Зависит от рецепта.',
      })
    })

    expect(result.current.manualDraft.cholesterolImpact).toBe('moderate')
    expect(result.current.manualDraft.cholesterolReason).toBe(
      'Зависит от рецепта.',
    )
  })
})
