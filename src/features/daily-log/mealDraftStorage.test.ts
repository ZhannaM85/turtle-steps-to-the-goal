import { afterEach, describe, expect, it } from 'vitest'
import { clearMealDraft, loadMealDraft, saveMealDraft } from './mealDraftStorage'

afterEach(() => {
  localStorage.clear()
})

interface SampleDraft {
  name: string
  amount: number
}

describe('mealDraftStorage', () => {
  it('returns null when there is no stored draft for a date', () => {
    expect(loadMealDraft('2026-03-01')).toBeNull()
  })

  it('round-trips a saved draft', () => {
    const draft: SampleDraft = { name: 'Soup', amount: 300 }
    saveMealDraft('2026-03-01', draft)

    expect(loadMealDraft<SampleDraft>('2026-03-01')).toEqual(draft)
  })

  it('keeps drafts for different dates independent', () => {
    saveMealDraft('2026-03-01', { name: 'Soup', amount: 300 })
    saveMealDraft('2026-03-02', { name: 'Salad', amount: 150 })

    expect(loadMealDraft<SampleDraft>('2026-03-01')?.name).toBe('Soup')
    expect(loadMealDraft<SampleDraft>('2026-03-02')?.name).toBe('Salad')
  })

  it('removes a draft on clear', () => {
    saveMealDraft('2026-03-01', { name: 'Soup', amount: 300 })
    clearMealDraft('2026-03-01')

    expect(loadMealDraft('2026-03-01')).toBeNull()
  })

  it('returns null instead of throwing for corrupted stored JSON', () => {
    localStorage.setItem('turtle-steps-meal-draft:2026-03-01', 'not json{')

    expect(loadMealDraft('2026-03-01')).toBeNull()
  })
})
