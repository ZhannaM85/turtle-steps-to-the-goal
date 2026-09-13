import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
import { VisibilityToggleButton } from '@/shared/ui/visibility-toggle-button'
import {
  useSectionVisibilityStore,
  type SectionKey,
} from '@/stores'
import { useTranslation } from '@/i18n'

export function useTodaySectionChrome() {
  const t = useTranslation()
  const sectionVisible = useSectionVisibilityStore((state) => state.visible)
  const toggleSection = useSectionVisibilityStore(
    (state) => state.toggleVisible,
  )

  function sectionTitle(key: SectionKey, title: string) {
    return (
      <SectionTitleWithToggle
        title={title}
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }

  function statCardAction(key: SectionKey, title: string) {
    return (
      <VisibilityToggleButton
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }

  return { sectionVisible, sectionTitle, statCardAction }
}
