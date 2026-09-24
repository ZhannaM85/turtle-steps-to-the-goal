import { type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { DateInput } from '@/shared/ui/date-input'
import { shiftDate } from './todayScreenUtils'

export function TodayDateNav({
  date,
  todayIso,
  maxNavigableDate,
  onSetDate,
  debug465,
  debug465Sizes,
  debug465PrevRef,
  debug465DateRef,
  debug465NextRef,
  debug465TodayRef,
}: {
  date: string
  todayIso: string
  maxNavigableDate: string
  onSetDate: (next: string | ((prev: string) => string)) => void
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
    <div className="flex flex-col gap-1.5">
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
        <DateInput
          id="log-date"
          ref={debug465DateRef}
          value={date}
          max={maxNavigableDate}
          onChange={(e) => onSetDate(e.target.value)}
          aria-label={t.today.dateLabel}
          className="box-border h-[2.625rem] w-48 shrink-0"
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
    </div>
  )
}
