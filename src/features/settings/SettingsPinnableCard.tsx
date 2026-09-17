import type { ComponentProps, MouseEvent } from 'react'
import { ChevronDown, Pin } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { settingsPinOrder, useSettingsPinStore } from '@/stores/settingsPinStore'
import {
  useSettingsCardsCollapseStore,
  type SettingsCardKey,
} from '@/stores/settingsCardsCollapseStore'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

/** #820 pin + #826 header collapse.
 * About uses pinnable={false} and collapsible={false} (#966).
 * #873 — preference-panel chrome (`section-shell`), not number-card `Card`.
 * Header padding reserves the pin/collapse cluster so long titles wrap
 * instead of running under the icons. */
export function SettingsPinnableCard({
  pinId,
  pinnable = true,
  collapsible = true,
  className,
  children,
  style,
  ...props
}: {
  pinId: SettingsCardKey
  pinnable?: boolean
  collapsible?: boolean
} & ComponentProps<'div'>) {
  const t = useTranslation()
  const pinned = useSettingsPinStore((state) => state.pinned)
  const togglePin = useSettingsPinStore((state) => state.toggle)
  const collapsed = useSettingsCardsCollapseStore(
    (state) => state.cards[pinId] ?? false,
  )
  const setCollapsed = useSettingsCardsCollapseStore(
    (state) => state.setCollapsed,
  )
  const isPinned = pinned.includes(pinId)
  const hideBody = collapsible && collapsed
  const headerPadClass =
    pinnable && collapsible
      ? '[&_[data-slot=card-header]]:!pe-28'
      : pinnable || collapsible
        ? '[&_[data-slot=card-header]]:!pe-16'
        : undefined

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if (!collapsible) return
    const target = event.target as HTMLElement
    if (
      target.closest(
        'button, a, input, select, textarea, [role="radio"], [role="switch"]',
      )
    ) {
      return
    }
    if (target.closest('[data-slot="card-header"]')) {
      setCollapsed(pinId, !collapsed)
    }
  }

  return (
    <div
      data-slot="settings-panel"
      className={cn(
        'section-shell relative flex flex-col gap-4 overflow-hidden py-4 text-sm [--card-spacing:--spacing(4)]',
        collapsible && '[&_[data-slot=card-header]]:cursor-pointer',
        headerPadClass,
        hideBody && '[&_[data-slot=card-content]]:hidden',
        className,
      )}
      {...props}
      style={{
        ...style,
        order: pinnable
          ? settingsPinOrder(pinned, pinId)
          : style?.order,
      }}
      onClick={handleCardClick}
    >
      {(collapsible || pinnable) && (
        <div className="absolute top-2 right-2 z-10 flex items-center">
          {collapsible && (
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              aria-label={
                collapsed
                  ? t.settings.expandCardLabel
                  : t.settings.collapseCardLabel
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(pinId, !collapsed)}
            >
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4 transition-transform',
                  !collapsed && 'rotate-180',
                )}
              />
            </Button>
          )}
          {pinnable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              aria-label={
                isPinned ? t.settings.unpinCardLabel : t.settings.pinCardLabel
              }
              aria-pressed={isPinned}
              onClick={() => togglePin(pinId)}
            >
              <Pin className={isPinned ? 'fill-current' : undefined} aria-hidden />
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
