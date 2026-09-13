import * as React from 'react'
import { formatLocalizedDate, useLocale } from '@/i18n'
import { cn } from '@/shared/lib/utils'

export type DateInputProps = Omit<React.ComponentProps<'input'>, 'type'>

function isoFromProp(value: React.ComponentProps<'input'>['value']): string {
  return typeof value === 'string' ? value : ''
}

/**
 * `#882` — native date picker with a Settings-locale closed-state label.
 *
 * iOS Safari formats `<input type="date">` from the OS locale, so a Russian
 * app still showed `13 Sep 2026`. The visible text is date-fns `PP`; the
 * native control stays an invisible overlay so the picker still opens.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, defaultValue, onChange, ...props }, ref) => {
    const locale = useLocale()
    const isControlled = value !== undefined
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [uncontrolledIso, setUncontrolledIso] = React.useState(() =>
      isoFromProp(defaultValue),
    )

    React.useLayoutEffect(() => {
      if (isControlled) return
      const next = inputRef.current?.value ?? ''
      setUncontrolledIso((prev) => (prev === next ? prev : next))
    })

    const iso = isControlled ? isoFromProp(value) : uncontrolledIso
    const display = iso ? formatLocalizedDate(iso, locale) : ''

    return (
      <div
        className={cn(
          'relative flex h-8 min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 py-0 text-base leading-normal transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[:disabled]:pointer-events-none has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-input/50 has-[:disabled]:opacity-50 md:text-sm dark:bg-input/30 dark:has-[:disabled]:bg-input/80',
          className,
        )}
      >
        <span aria-hidden className="pointer-events-none whitespace-nowrap">
          {display}
        </span>
        <input
          {...props}
          ref={(node) => {
            inputRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          type="date"
          data-slot="input"
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => {
            if (!isControlled) setUncontrolledIso(event.target.value)
            onChange?.(event)
          }}
          className="absolute inset-0 cursor-pointer opacity-0 text-transparent [-webkit-text-fill-color:transparent] [&::-webkit-datetime-edit]:opacity-0 [&::-webkit-date-and-time-value]:opacity-0"
        />
      </div>
    )
  },
)
DateInput.displayName = 'DateInput'
