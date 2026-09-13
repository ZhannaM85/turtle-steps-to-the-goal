import { Capacitor } from '@capacitor/core'
import { useTranslation } from '@/i18n'
import {
  SETTINGS_CARD_GROUPS,
  SETTINGS_GROUP_HEADING_ORDER,
  anySettingsCardExpanded,
  settingsGroupTitleKey,
  useSettingsCardsCollapseStore,
  type SettingsCardKey,
  type SettingsGroupId,
} from '@/stores'

function visibleGroupKeys(group: SettingsGroupId): SettingsCardKey[] {
  return SETTINGS_CARD_GROUPS[group].filter(
    (key) =>
      key !== 'healthConnect' || Capacitor.getPlatform() === 'android',
  )
}

/** #877 — named Settings group heading + per-group collapse (44px target). */
export function SettingsSectionHeading({ group }: { group: SettingsGroupId }) {
  const t = useTranslation()
  const title = t.settings[settingsGroupTitleKey(group)]
  const cards = useSettingsCardsCollapseStore((state) => state.cards)
  const setKeysCollapsed = useSettingsCardsCollapseStore(
    (state) => state.setKeysCollapsed,
  )
  const keys = visibleGroupKeys(group)
  const anyExpanded = anySettingsCardExpanded(cards, keys)

  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{ order: SETTINGS_GROUP_HEADING_ORDER[group] }}
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setKeysCollapsed(keys, anyExpanded)}
      >
        {anyExpanded
          ? t.settings.collapseSettingsGroupLabel(title)
          : t.settings.expandSettingsGroupLabel(title)}
      </button>
    </div>
  )
}
