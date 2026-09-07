import type { ComponentProps } from 'react'
import { Pin } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { settingsPinOrder, useSettingsPinStore } from '@/stores/settingsPinStore'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

/** #820 — flex `order` so pinned cards sit under About without reshuffling JSX. */
export function SettingsPinnableCard({
  pinId,
  className,
  children,
  ...props
}: { pinId: string } & ComponentProps<typeof Card>) {
  const t = useTranslation()
  const pinned = useSettingsPinStore((state) => state.pinned)
  const toggle = useSettingsPinStore((state) => state.toggle)
  const isPinned = pinned.includes(pinId)
  return (
    <Card
      className={cn('relative', className)}
      {...props}
      style={{ order: settingsPinOrder(pinned, pinId) }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-3 right-3 z-10"
        aria-label={isPinned ? t.settings.unpinCardLabel : t.settings.pinCardLabel}
        aria-pressed={isPinned}
        onClick={() => toggle(pinId)}
      >
        <Pin className={isPinned ? 'fill-current' : undefined} aria-hidden />
      </Button>
      {children}
    </Card>
  )
}
