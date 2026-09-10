import type { ReactNode } from 'react'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'

export interface TrackedFieldToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: ReactNode
}

/**
 * #837 — one What-to-track option as a full-width row: label, short
 * definition, and a clear switch. Replaces the wrapping chip grid so on
 * vs off is obvious and each option can explain what it shows on Day.
 */
export function TrackedFieldToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: TrackedFieldToggleRowProps) {
  const descriptionId = `${id}-description`
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-sm font-medium leading-snug">
            {label}
          </Label>
          <p
            id={descriptionId}
            className="mt-1 text-sm text-muted-foreground"
          >
            {description}
          </p>
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-describedby={descriptionId}
        />
      </div>
      {children}
    </div>
  )
}
