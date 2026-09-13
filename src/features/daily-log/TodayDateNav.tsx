import { type RefObject } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { isWebKitEngine, shiftDate } from './todayScreenUtils'

export function TodayDateNav({
  date,
  todayIso,
  realTodayIso,
  maxNavigableDate,
  hasEntry,
  onSetDate,
  onStartTodayEarly,
  debug465,
  debug465Sizes,
  debug465PrevRef,
  debug465DateRef,
  debug465NextRef,
  debug465TodayRef,
}: {
  date: string
  todayIso: string
  realTodayIso: string
  maxNavigableDate: string
  hasEntry: boolean
  onSetDate: (next: string | ((prev: string) => string)) => void
  onStartTodayEarly: (realToday: string) => void
  debug465: boolean
  debug465Sizes: Record<
    'prev' | 'date' | 'next' | 'today',
    { width: number; height: number } | null
  >
  debug465PrevRef: RefObject<HTMLButtonElement | null>
  debug465DateRef: RefObject<HTMLInputElement | null>
  debug465NextRef: RefObject<HTMLButtonElement | null>
  debug465TodayRef: RefObject<HTMLButtonElement | null>
}) {
  const t = useTranslation()
  return (
    <div className="sticky top-[calc(2.75rem+1px)] z-10 -mx-4 flex flex-col gap-1.5 border-b border-border bg-background px-4 py-2 sm:top-[calc(3.5rem+1px)]">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="log-date">{t.today.dateLabel}</Label>
        {hasEntry && (
          <InfoTooltip
            text={t.today.dayHasEntriesLabel}
            label={t.today.dayHasEntriesLabel}
            className="size-auto rounded-full bg-primary/15 p-0.5 text-primary hover:text-primary"
            icon={<Check aria-hidden="true" className="size-3" />}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          ref={debug465PrevRef}
          type="button"
          variant="outline"
          size="icon-xl"
          className="size-[2.625rem]"
          aria-label={t.today.previousDayLabel}
          onClick={() => onSetDate((prev) => shiftDate(prev, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Input
          id="log-date"
          ref={debug465DateRef}
          type="date"
          value={date}
          max={maxNavigableDate}
          onChange={(e) => onSetDate(e.target.value)}
          className={
            isWebKitEngine ? 'max-w-48 py-1' : 'max-w-48 h-[2.625rem] py-1'
          }
        />
        <Button
          ref={debug465NextRef}
          type="button"
          variant="outline"
          size="icon-xl"
          className="size-[2.625rem]"
          aria-label={t.today.nextDayLabel}
          disabled={date >= maxNavigableDate}
          onClick={() => onSetDate((prev) => shiftDate(prev, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button
          ref={debug465TodayRef}
          type="button"
          variant="outline"
          size="sm"
          className={
            date === todayIso
              ? 'invisible h-[2.625rem] shrink-0'
              : 'h-[2.625rem] shrink-0'
          }
          disabled={date === todayIso}
          aria-hidden={date === todayIso}
          tabIndex={date === todayIso ? -1 : undefined}
          onClick={() => onSetDate(todayIso)}
        >
          {t.today.jumpToTodayButton}
        </Button>
      </div>
      {debug465 && (
        <p className="font-mono text-xs text-muted-foreground">
          #465 w×h (px) — prev:
          {debug465Sizes.prev
            ? `${debug465Sizes.prev.width.toFixed(0)}×${debug465Sizes.prev.height.toFixed(0)}`
            : '?'}{' '}
          date:
          {debug465Sizes.date
            ? `${debug465Sizes.date.width.toFixed(0)}×${debug465Sizes.date.height.toFixed(0)}`
            : '?'}{' '}
          next:
          {debug465Sizes.next
            ? `${debug465Sizes.next.width.toFixed(0)}×${debug465Sizes.next.height.toFixed(0)}`
            : '?'}{' '}
          today:
          {debug465Sizes.today
            ? `${debug465Sizes.today.width.toFixed(0)}×${debug465Sizes.today.height.toFixed(0)}`
            : '?'}
        </p>
      )}
      {realTodayIso !== todayIso && date === todayIso && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <span>{t.today.startTodayEarlyBanner}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onStartTodayEarly(realTodayIso)}
          >
            {t.today.startTodayEarlyButton}
          </Button>
        </div>
      )}
    </div>
  )
}
