import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import { eatingReasonDisplayLabel } from './eatingReasonDisplay'

describe('eatingReasonDisplayLabel (#766)', () => {
  const t = getDictionary('en')

  it('uses the locale default for a built-in with no override', () => {
    expect(eatingReasonDisplayLabel('hunger', t)).toBe('Hunger')
    expect(eatingReasonDisplayLabel('angry', t)).toBe('Angry')
    expect(eatingReasonDisplayLabel('lonely', t)).toBe('Lonely')
    expect(eatingReasonDisplayLabel('tired', t)).toBe('Tired')
  })

  it('uses the override for a built-in when set', () => {
    expect(
      eatingReasonDisplayLabel('hunger', t, { hunger: 'Stomach growl' }),
    ).toBe('Stomach growl')
  })

  it('returns a custom reason as stored', () => {
    expect(eatingReasonDisplayLabel('Tired after work', t)).toBe(
      'Tired after work',
    )
  })
})
