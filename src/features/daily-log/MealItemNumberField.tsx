import {
  limitToMaxFractionDigits,
  roundToMaxFractionDigits,
} from '@/shared/lib/limitDecimalInput'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

export function MealItemNumberField({
  label,
  icon,
  value,
  onChange,
  onBlur,
  onEnter,
  maxFractionDigits,
  compact = false,
}: {
  label: string
  /** Leading emoji (#344 redesign) — e.g. 🌿 for protein, 💧 for fat.
   * Purely decorative (aria-hidden), matching the design mockup's
   * icon-per-nutrition-field treatment. Omitted for fields the mockup
   * doesn't give an icon to (the plain kcal/quantity fields). */
  icon?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onEnter: () => void
  /** #800 — kcal/macros cap at 2 decimals; quantity fields omit this. */
  maxFractionDigits?: 2
  /** #990 — protein/fat/carbs share one phone-width row. */
  compact?: boolean
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', compact ? 'gap-1' : 'gap-1.5')}>
      <span
        className={cn(
          'flex items-center text-muted-foreground',
          compact ? 'gap-1 text-xs whitespace-nowrap' : 'gap-1.5 text-sm',
        )}
      >
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 leading-none',
              compact ? 'text-sm' : 'text-base',
            )}
          >
            {icon}
          </span>
        )}
        {label}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) =>
          onChange(
            maxFractionDigits === 2
              ? limitToMaxFractionDigits(e.target.value, maxFractionDigits)
              : e.target.value,
          )
        }
        onPaste={
          maxFractionDigits === 2
            ? (e) => {
                e.preventDefault()
                onChange(
                  roundToMaxFractionDigits(
                    e.clipboardData.getData('text'),
                    maxFractionDigits,
                  ),
                )
              }
            : undefined
        }
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        className="h-12 text-base"
      />
    </div>
  )
}
