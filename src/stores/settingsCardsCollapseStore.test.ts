import { beforeEach, describe, expect, it } from 'vitest'
import {
  anySettingsCardExpanded,
  useSettingsCardsCollapseStore,
} from './settingsCardsCollapseStore'

describe('settingsCardsCollapseStore (#826)', () => {
  beforeEach(() => {
    useSettingsCardsCollapseStore.getState().expandAll()
  })

  it('collapses and expands a single card', () => {
    useSettingsCardsCollapseStore.getState().setCollapsed('export', true)
    expect(useSettingsCardsCollapseStore.getState().cards.export).toBe(true)
    useSettingsCardsCollapseStore.getState().setCollapsed('export', false)
    expect(useSettingsCardsCollapseStore.getState().cards.export).toBe(false)
  })

  it('collapseAll hides every card; expandAll restores them', () => {
    useSettingsCardsCollapseStore.getState().collapseAll()
    expect(
      anySettingsCardExpanded(useSettingsCardsCollapseStore.getState().cards, [
        'about',
        'export',
      ]),
    ).toBe(false)
    useSettingsCardsCollapseStore.getState().expandAll()
    expect(
      anySettingsCardExpanded(useSettingsCardsCollapseStore.getState().cards, [
        'about',
        'export',
      ]),
    ).toBe(true)
  })
})
