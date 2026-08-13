import { format, parseISO } from 'date-fns'
import {
  ENTRY_FIELD_COMPARISON_VALENCE,
  comparisonDirection,
  comparisonTone,
  type ComparableEntryField,
  type FieldBaseline,
} from '@/domain/dailyEntry'
import {
  formatExactNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
  type Locale,
} from '@/i18n'
import { useDebouncedValue } from '@/shared/hooks'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import { cn } from '@/shared/lib/utils'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { useEntryComparisonStore } from '@/stores'

const LIVE_DEBOUNCE_MS = 300

export type EntryComparisonUnit = 'kg' | 'percent' | 'hours' | 'none'

function formatComparisonAmount(
  absDelta: number,
  unit: EntryComparisonUnit,
  locale: Locale,
  labels: { kg: string; percent: string; hours: string; minutes: string },
): string {
  if (unit === 'hours') {
    return formatSleepDuration(absDelta, labels.hours, labels.minutes)
  }
  const magnitude = formatExactNumber(absDelta, locale)
  switch (unit) {
    case 'kg':
      return `${magnitude} ${labels.kg}`
    case 'percent':
      return `${magnitude}${labels.percent}`
    case 'none':
      return magnitude
  }
}

function formatBaselineDateLabel(date: string, locale: Locale): string {
  return format(parseISO(date), 'd MMMM', { locale: getDateFnsLocale(locale) })
}

function buildComparisonLine(args: {
  current: number
  baseline: number
  field: ComparableEntryField
  unit: EntryComparisonUnit
  locale: Locale
  unitLabels: { kg: string; percent: string; hours: string; minutes: string }
  phrasing: 'liveYesterday' | 'liveDate' | 'tipYesterday' | 'tipDate' | 'tip30'
  dateLabel?: string
  t: ReturnType<typeof useTranslation>
}): { text: string; tone: 'good' | 'bad' } | null {
  const direction = comparisonDirection(args.current, args.baseline)
  const tone = comparisonTone(
    args.current,
    args.baseline,
    ENTRY_FIELD_COMPARISON_VALENCE[args.field],
  )
  if (direction === null || tone === null) return null

  const arrow = direction === 'up' ? '↑' : '↓'
  const amount = formatComparisonAmount(
    Math.abs(args.current - args.baseline),
    args.unit,
    args.locale,
    args.unitLabels,
  )

  let text: string
  switch (args.phrasing) {
    case 'liveYesterday':
      text = args.t.dailyEntry.entryComparisonComparedToYesterday(arrow, amount)
      break
    case 'liveDate':
      text = args.t.dailyEntry.entryComparisonComparedToDate(
        arrow,
        amount,
        args.dateLabel ?? '',
      )
      break
    case 'tipYesterday':
      text = args.t.dailyEntry.entryComparisonVsYesterday(arrow, amount)
      break
    case 'tipDate':
      text = args.t.dailyEntry.entryComparisonVsDate(
        arrow,
        amount,
        args.dateLabel ?? '',
      )
      break
    case 'tip30':
      text = args.t.dailyEntry.entryComparisonVs30DaysAgo(arrow, amount)
      break
  }

  return { text, tone }
}

const toneClassName: Record<'good' | 'bad', string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-orange-600 dark:text-orange-400',
}

export interface EntryFieldComparisonLiveProps {
  field: ComparableEntryField
  currentValue: number | undefined
  prior: FieldBaseline | null
  unit: EntryComparisonUnit
}

/** Live arrow + text under an input while editing (#664). */
export function EntryFieldComparisonLive({
  field,
  currentValue,
  prior,
  unit,
}: EntryFieldComparisonLiveProps) {
  const enabled = useEntryComparisonStore((state) => state.enabled)
  const t = useTranslation()
  const locale = useLocale()
  const debouncedValue = useDebouncedValue(currentValue, LIVE_DEBOUNCE_MS)

  if (!enabled || prior === null || debouncedValue === undefined) return null

  const unitLabels = {
    kg: t.dailyEntry.kgUnit,
    percent: t.dailyEntry.percentUnit,
    hours: t.dailyEntry.hoursUnit,
    minutes: t.dailyEntry.minutesUnit,
  }
  const line = buildComparisonLine({
    current: debouncedValue,
    baseline: prior.value,
    field,
    unit,
    locale,
    unitLabels,
    phrasing: prior.isYesterday ? 'liveYesterday' : 'liveDate',
    dateLabel: prior.isYesterday
      ? undefined
      : formatBaselineDateLabel(prior.date, locale),
    t,
  })
  if (line === null) return null

  return (
    <p className={cn('text-xs', toneClassName[line.tone])} aria-live="polite">
      {line.text}
    </p>
  )
}

export interface EntryFieldComparisonInfoProps {
  field: ComparableEntryField
  currentValue: number | undefined
  prior: FieldBaseline | null
  day30Value: number | undefined
  unit: EntryComparisonUnit
  className?: string
}

/** Post-save ⓘ next to a field label (#664). */
export function EntryFieldComparisonInfo({
  field,
  currentValue,
  prior,
  day30Value,
  unit,
  className,
}: EntryFieldComparisonInfoProps) {
  const enabled = useEntryComparisonStore((state) => state.enabled)
  const t = useTranslation()
  const locale = useLocale()

  if (!enabled || currentValue === undefined) return null

  const unitLabels = {
    kg: t.dailyEntry.kgUnit,
    percent: t.dailyEntry.percentUnit,
    hours: t.dailyEntry.hoursUnit,
    minutes: t.dailyEntry.minutesUnit,
  }

  const lines: string[] = []

  if (prior !== null) {
    const priorLine = buildComparisonLine({
      current: currentValue,
      baseline: prior.value,
      field,
      unit,
      locale,
      unitLabels,
      phrasing: prior.isYesterday ? 'tipYesterday' : 'tipDate',
      dateLabel: prior.isYesterday
        ? undefined
        : formatBaselineDateLabel(prior.date, locale),
      t,
    })
    if (priorLine) lines.push(priorLine.text)
  }

  if (day30Value !== undefined) {
    const day30Line = buildComparisonLine({
      current: currentValue,
      baseline: day30Value,
      field,
      unit,
      locale,
      unitLabels,
      phrasing: 'tip30',
      t,
    })
    if (day30Line) lines.push(day30Line.text)
  }

  if (lines.length === 0) return null

  return (
    <InfoTooltip
      text={lines.join('\n')}
      label={t.dailyEntry.entryComparisonInfoLabel}
      className={cn('align-middle', className)}
    />
  )
}
