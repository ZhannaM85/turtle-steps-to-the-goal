import { Capacitor } from '@capacitor/core'
import { useTranslation } from '@/i18n'
import {
  SETTINGS_CARD_KEYS,
  anySettingsCardExpanded,
  useSettingsCardsCollapseStore,
  type SettingsCardKey,
} from '@/stores/settingsCardsCollapseStore'

/**
 * #826 — Collapse all / Expand all for Settings cards, same quiet control
 * as Day (`DaySectionsCollapseControl`).
 */
export function SettingsCardsCollapseControl() {
  const t = useTranslation()
  const cards = useSettingsCardsCollapseStore((state) => state.cards)
  const collapseAll = useSettingsCardsCollapseStore((state) => state.collapseAll)
  const expandAll = useSettingsCardsCollapseStore((state) => state.expandAll)
  const keys: SettingsCardKey[] = SETTINGS_CARD_KEYS.filter(
    (key) =>
      key !== 'healthConnect' || Capacitor.getPlatform() === 'android',
  )
  const anyExpanded = anySettingsCardExpanded(cards, keys)

  return (
    <div className="flex justify-end" style={{ order: -3500 }}>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (anyExpanded) collapseAll()
          else expandAll()
        }}
      >
        {anyExpanded
          ? t.today.collapseAllSectionsLabel
          : t.today.expandAllSectionsLabel}
      </button>
    </div>
  )
}
