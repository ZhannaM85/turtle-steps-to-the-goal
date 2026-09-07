import type { ComponentProps, MouseEvent } from 'react'
import { ChevronDown, Pin } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { settingsPinOrder, useSettingsPinStore } from '@/stores/settingsPinStore'
import {
  useSettingsCardsCollapseStore,
  type SettingsCardKey,
} from '@/stores/settingsCardsCollapseStore'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

/** #820 pin + #826 header collapse (About uses pinnable={false}). */
export function SettingsPinnableCard({
  pinId,
  pinnable = true,
  className,
  children,
  style,
  ...props
}: {
  pinId: SettingsCardKey
  pinnable?: boolean
} & ComponentProps<typeof Card>) {
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

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
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
    <Card
      className={cn(
        'relative [&_[data-slot=card-header]]:cursor-pointer',
        collapsed && '[&_[data-slot=card-content]]:hidden',
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
      <div className="absolute top-3 right-3 z-10 flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
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
        {pinnable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
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
      {children}
    </Card>
  )
}
