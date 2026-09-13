import { describe, expect, it } from 'vitest'
import { SETTINGS_CARD_KEYS } from './settingsCardsCollapseStore'
import {
  SETTINGS_CARD_GROUPS,
  settingsCardNaturalOrder,
} from './settingsCardGroups'

describe('settingsCardGroups (#877)', () => {
  it('places every pinnable card except About in exactly one group', () => {
    const grouped = Object.values(SETTINGS_CARD_GROUPS).flat()
    expect(new Set(grouped).size).toBe(grouped.length)
    for (const key of SETTINGS_CARD_KEYS) {
      if (key === 'about' || key === 'features') continue
      expect(grouped).toContain(key)
    }
  })

  it('keeps unpinned group cards after their heading order', () => {
    expect(settingsCardNaturalOrder('features')).toBe(50)
    expect(settingsCardNaturalOrder('units')).toBe(201)
    expect(settingsCardNaturalOrder('export')).toBe(402)
    expect(settingsCardNaturalOrder('clearAllData')).toBe(502)
  })
})
