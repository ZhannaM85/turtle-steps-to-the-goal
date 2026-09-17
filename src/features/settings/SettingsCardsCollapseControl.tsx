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
 * #888 — sits in `PageHeader`'s action column beside the description, not
 * a full-width `min-h-11` row that reserved an empty band.
 */
export function SettingsCardsCollapseControl() {
  const t = useTranslation()
  const cards = useSettingsCardsCollapseStore((state) => state.cards)
  const collapseAll = useSettingsCardsCollapseStore((state) => state.collapseAll)
  const expandAll = useSettingsCardsCollapseStore((state) => state.expandAll)
  const keys: SettingsCardKey[] = SETTINGS_CARD_KEYS.filter(
    (key) =>
      key !== 'about' &&
      (key !== 'healthConnect' || Capacitor.getPlatform() === 'android'),
  )
  const anyExpanded = anySettingsCardExpanded(cards, keys)

  return (
    <button
      type="button"
      className="inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (anyExpanded) collapseAll()
        else expandAll()
      }}
    >
      {anyExpanded
        ? t.today.collapseAllSectionsLabel
        : t.today.expandAllSectionsLabel}
    </button>
  )
}
