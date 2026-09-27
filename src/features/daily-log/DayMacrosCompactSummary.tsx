import { cn } from '@/shared/lib/utils'

/** #1022 / #1029 — shared tone for the sticky strip and the collapsed row.
 * #1032 — `px-3 py-2` matches the Day note chips, instead of a fixed
 * `h-8` that left the figures tight against the beige edges. */
export const DAY_MACROS_COMPACT_SUMMARY_CLASSNAME =
  'flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-muted px-3 py-2 text-left text-sm text-foreground tabular-nums'

export function DayMacrosCompactFigures({
  kcal,
  macros,
}: {
  kcal: string
  macros: string | null
}) {
  return (
    <>
      <span className="shrink-0">{kcal}</span>
      {macros ? (
        <span className="truncate text-muted-foreground">{macros}</span>
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
