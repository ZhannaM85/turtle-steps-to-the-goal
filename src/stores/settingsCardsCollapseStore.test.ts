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

  it('setKeysCollapsed toggles only that group (#877)', () => {
    useSettingsCardsCollapseStore
      .getState()
      .setKeysCollapsed(['units', 'appearance'], true)
    expect(useSettingsCardsCollapseStore.getState().cards.units).toBe(true)
    expect(useSettingsCardsCollapseStore.getState().cards.appearance).toBe(true)
    expect(useSettingsCardsCollapseStore.getState().cards.export).toBe(false)
  })

  it('collapseAll hides every collapsible card; About stays expanded (#966)', () => {
    useSettingsCardsCollapseStore.getState().collapseAll()
    expect(useSettingsCardsCollapseStore.getState().cards.about).toBe(false)
    expect(useSettingsCardsCollapseStore.getState().cards.export).toBe(true)
    expect(
      anySettingsCardExpanded(useSettingsCardsCollapseStore.getState().cards, [
        'export',
      ]),
    ).toBe(false)
    useSettingsCardsCollapseStore.getState().expandAll()
    expect(
      anySettingsCardExpanded(useSettingsCardsCollapseStore.getState().cards, [
        'export',
      ]),
    ).toBe(true)
  })
})
