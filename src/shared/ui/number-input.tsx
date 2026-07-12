import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Label } from '@/shared/ui/label'

export interface NumberInputProps extends Omit<
  React.ComponentProps<'input'>,
  'type'
> {
  label: string
  unit?: string
  error?: string
  hint?: string
  tooltip?: string
  tooltipLabel?: string
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      unit,
      error,
      hint,
      tooltip,
      tooltipLabel,
      id,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={inputId}>{label}</Label>
          {tooltip && (
            <InfoTooltip text={tooltip} label={tooltipLabel ?? label} />
          )}
        </div>
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(unit && 'pr-10', className)}
            {...props}
          />
          {unit && (
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  },
)
NumberInput.displayName = 'NumberInput'
