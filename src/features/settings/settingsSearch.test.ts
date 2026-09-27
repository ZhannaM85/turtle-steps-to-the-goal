import { describe, expect, it } from 'vitest'
import { SETTINGS_CARD_GROUPS } from '@/stores/settingsCardGroups'
import {
  settingsCardVisible,
  settingsGroupVisible,
  settingsRowVisible,
  settingsSearchMatches,
  settingsSearchQueryActive,
} from './settingsSearch'

describe('settingsSearch (#1018)', () => {
  it('treats a blank query as matching everything', () => {
    expect(settingsSearchQueryActive('   ')).toBe(false)
    expect(settingsSearchMatches('  ', [])).toBe(true)
    expect(settingsCardVisible('units', '')).toBe(true)
    expect(settingsRowVisible('trackedFields', 'sleep', '')).toBe(true)
  })

  it('matches LDL, сон, and импорт without caring about case', () => {
    expect(settingsRowVisible('trackedFields', 'ldlImpact', 'ldl')).toBe(true)
    expect(settingsRowVisible('trackedFields', 'sleep', 'LDL')).toBe(false)
    expect(settingsCardVisible('trackedFields', 'LDL')).toBe(true)
    expect(settingsCardVisible('units', 'LDL')).toBe(false)
    expect(settingsRowVisible('trackedFields', 'sleep', 'сон')).toBe(true)
    expect(settingsRowVisible('trackedFields', 'ldlImpact', 'сон')).toBe(false)
    expect(settingsCardVisible('export', 'импорт')).toBe(true)
    expect(settingsCardVisible('units', 'импорт')).toBe(false)
    expect(
      settingsRowVisible('trackedFields', 'catalogFoodImport', 'импорт'),
    ).toBe(true)
    expect(settingsRowVisible('trackedFields', 'sleep', 'импорт')).toBe(false)
  })

  it('shows a whole group when its title matches', () => {
    expect(
      settingsGroupVisible('logging', 'Дневник', SETTINGS_CARD_GROUPS.logging),
    ).toBe(true)
    expect(settingsCardVisible('trackedFields', 'Дневник')).toBe(true)
    expect(settingsRowVisible('trackedFields', 'sleep', 'Дневник')).toBe(true)
    expect(settingsCardVisible('units', 'Дневник')).toBe(false)
    expect(
      settingsGroupVisible('appearance', 'Дневник', SETTINGS_CARD_GROUPS.appearance),
    ).toBe(false)
  })
})
