import { describe, expect, it } from 'vitest'
import {
  defaultTimeEatenForTemplatePick,
  timeAfterMealTemplatePick,
} from './mealTemplateTime'

describe('defaultTimeEatenForTemplatePick (#862 Option 2)', () => {
  it('uses the built-in slot time for EN/RU/MFP labels', () => {
    expect(
      defaultTimeEatenForTemplatePick('Breakfast', { referenceHHMM: '15:00' }),
    ).toBe('08:00')
    expect(
      defaultTimeEatenForTemplatePick('Ужин', { referenceHHMM: '10:00' }),
    ).toBe('19:00')
    expect(
      defaultTimeEatenForTemplatePick('Snacks', { referenceHHMM: '10:00' }),
    ).toBe('16:00')
  })

  it('uses remembered slot prefs for built-in labels', () => {
    const slotTimes = {
      breakfast: '09:30',
      lunch: '14:00',
      dinner: '20:30',
      snack: '17:00',
    }
    expect(
      defaultTimeEatenForTemplatePick('Lunch', {
        referenceHHMM: '12:00',
        slotTimes,
      }),
    ).toBe('14:00')
  })

  it('stamps the unused slot nearest to now for a custom template', () => {
    expect(
      defaultTimeEatenForTemplatePick('Second breakfast', {
        referenceHHMM: '15:00',
      }),
    ).toBe('16:00')
    expect(
      defaultTimeEatenForTemplatePick('Ужин 2', {
        referenceHHMM: '10:00',
      }),
    ).toBe('08:00')
    expect(
      defaultTimeEatenForTemplatePick('Night food', {
        referenceHHMM: '12:00',
      }),
    ).toBe('13:00')
  })

  it('skips slots already used by today’s other meals', () => {
    expect(
      defaultTimeEatenForTemplatePick('Second breakfast', {
        referenceHHMM: '15:00',
        siblingMeals: [{ label: 'Lunch' }, { label: 'Snack', timeEaten: '16:00' }],
      }),
    ).toBe('19:00')
  })

  it('treats an exact slot-default clock as using that slot', () => {
    expect(
      defaultTimeEatenForTemplatePick('Second breakfast', {
        referenceHHMM: '09:00',
        siblingMeals: [{ label: 'Night food', timeEaten: '13:00' }],
      }),
    ).toBe('08:00')
  })

  it('picks the nearest slot even when every built-in is already used', () => {
    expect(
      defaultTimeEatenForTemplatePick('Night food', {
        referenceHHMM: '12:00',
        siblingMeals: [
          { label: 'Breakfast' },
          { label: 'Lunch' },
          { label: 'Dinner' },
          { label: 'Snack' },
        ],
      }),
    ).toBe('13:00')
  })

  it('breaks a circular-distance tie toward the upcoming slot', () => {
    // 12:00 is 4h from both 08:00 and 16:00 once lunch is taken.
    expect(
      defaultTimeEatenForTemplatePick('Second breakfast', {
        referenceHHMM: '12:00',
        siblingMeals: [{ label: 'Lunch' }],
      }),
    ).toBe('16:00')
  })

  it('returns undefined for a cleared label', () => {
    expect(
      defaultTimeEatenForTemplatePick('', { referenceHHMM: '12:00' }),
    ).toBeUndefined()
    expect(
      defaultTimeEatenForTemplatePick('   ', { referenceHHMM: '12:00' }),
    ).toBeUndefined()
  })

  it('timeAfterMealTemplatePick skips clear and already-timed edits', () => {
    expect(
      timeAfterMealTemplatePick('', { referenceHHMM: '12:00' }),
    ).toBeUndefined()
    expect(
      timeAfterMealTemplatePick('Second breakfast', {
        referenceHHMM: '12:00',
        existingTime: '07:15',
      }),
    ).toBeUndefined()
    expect(
      timeAfterMealTemplatePick('Second breakfast', {
        referenceHHMM: '12:00',
        existingTime: '07:15',
        overwriteExisting: true,
      }),
    ).toBe('13:00')
    expect(
      timeAfterMealTemplatePick('Second breakfast', {
        referenceHHMM: '15:00',
      }),
    ).toBe('16:00')
  })
})
