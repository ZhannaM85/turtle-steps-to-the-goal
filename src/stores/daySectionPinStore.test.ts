import { beforeEach, describe, expect, it } from 'vitest'
import {
  DAY_SECTION_PIN_STORAGE_KEY,
  useDaySectionPinStore,
} from './daySectionPinStore'

describe('daySectionPinStore (#1022)', () => {
  beforeEach(() => {
    localStorage.clear()
    useDaySectionPinStore.setState({ pinned: [] })
  })

  it('toggles pin order and persists it under the day pin key', () => {
    useDaySectionPinStore.getState().toggle('macros')
    useDaySectionPinStore.getState().toggle('meals')
    expect(useDaySectionPinStore.getState().pinned).toEqual(['macros', 'meals'])

    const raw = localStorage.getItem(DAY_SECTION_PIN_STORAGE_KEY)
    expect(raw).toContain('macros')
    expect(raw).toContain('meals')

    useDaySectionPinStore.setState({ pinned: [] })
    localStorage.setItem(DAY_SECTION_PIN_STORAGE_KEY, raw ?? '')
    useDaySectionPinStore.persist.rehydrate()
    expect(useDaySectionPinStore.getState().pinned).toEqual(['macros', 'meals'])
  })

  it('drops a pin id that is no longer known', () => {
    localStorage.setItem(
      DAY_SECTION_PIN_STORAGE_KEY,
      JSON.stringify({ state: { pinned: ['macros', 'retired'] }, version: 0 }),
    )
    useDaySectionPinStore.persist.rehydrate()
    expect(useDaySectionPinStore.getState().pinned).toEqual(['macros'])
  })

  it('keeps a saved water pin in pin order (#1074)', () => {
    localStorage.setItem(
      DAY_SECTION_PIN_STORAGE_KEY,
      JSON.stringify({ state: { pinned: ['water', 'macros'] }, version: 0 }),
    )
    useDaySectionPinStore.persist.rehydrate()
    expect(useDaySectionPinStore.getState().pinned).toEqual(['water', 'macros'])
  })
})
