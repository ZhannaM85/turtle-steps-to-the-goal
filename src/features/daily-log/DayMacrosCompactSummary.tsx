import { cn } from '@/shared/lib/utils'

/** #1022 / #1029 — shared tone for the sticky strip and the collapsed row.
 * #1032 — `px-3 py-2` matches the Day note chips, instead of a fixed
 * `h-8` that left the figures tight against the beige edges.
 * #1034 — the middot between kcal and macros is the separator.
 * #1041 — the line wraps. `overflow-hidden` + `truncate` cut «У … г»
 * off at the card edge. */
export const DAY_MACROS_COMPACT_SUMMARY_CLASSNAME =
  'block w-full min-w-0 whitespace-normal rounded-lg bg-muted px-3 py-2 text-left text-sm leading-5 text-foreground tabular-nums'

export function DayMacrosCompactFigures({
  kcal,
  macros,
}: {
  kcal: string
  macros: string | null
}) {
  return (
    <>
      <span>{kcal}</span>
      {macros ? (
        <span className="text-muted-foreground">{` · ${macros}`}</span>
      ) : null}
    </>
  )
}

export function DayMacrosCompactSummary({
  kcal,
  macros,
  className,
}: {
  kcal: string
  macros: string | null
  className?: string
}) {
  return (
    <span
      data-slot="day-macros-compact-summary"
      className={cn(DAY_MACROS_COMPACT_SUMMARY_CLASSNAME, className)}
    >
      <DayMacrosCompactFigures kcal={kcal} macros={macros} />
    </span>
  )
}
