import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  EATING_REASONS,
  isBuiltInEatingReason,
  orderEatingReasons,
} from '@/domain/dailyEntry'
import { useTranslation } from '@/i18n'
import {
  eatingReasonDisplayLabel,
  formatEatingReasonsLine,
} from '@/shared/lib/eatingReasonDisplay'
import { cn } from '@/shared/lib/utils'
import { useEatingReasonTrackingStore } from '@/stores'
import { Label } from '@/shared/ui/label'

interface EatingReasonPickerProps {
  id?: string
  value: string[]
  onChange: (reasons: string[]) => void
}

/**
 * #774 — Why-am-I-eating control. Not a native `<select>`, so several
 * options can stay selected; the closed row shows every pick.
 * #1062 — the open list overlays the sheet (same stacking as meal
 * search suggestions) instead of growing the row and pushing the
 * search field down.
 */
export function EatingReasonPicker({
  id,
  value,
  onChange,
}: EatingReasonPickerProps) {
  const t = useTranslation()
  const customReasons = useEatingReasonTrackingStore(
    (state) => state.customReasons,
  )
  const builtinLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listId = `${fieldId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const extras = value.filter(
    (reason) =>
      !isBuiltInEatingReason(reason) && !customReasons.includes(reason),
  )
  const listedCustoms =
    extras.length > 0 ? [...customReasons, ...extras] : customReasons

  const summary =
    value.length > 0
      ? formatEatingReasonsLine(value, t, builtinLabelOverrides)
      : t.dailyEntry.eatingReasonNoneOption

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggle(reason: string) {
    if (value.includes(reason)) {
      onChange(value.filter((item) => item !== reason))
      return
    }
    onChange(orderEatingReasons([...value, reason]))
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex min-w-0 flex-col gap-1.5',
        open && 'z-30',
      )}
    >
      <Label htmlFor={fieldId}>{t.dailyEntry.eatingReasonFieldLabel}</Label>
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        aria-label={t.dailyEntry.eatingReasonFieldLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          'flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 md:text-sm',
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.dailyEntry.eatingReasonFieldLabel}
          aria-multiselectable="true"
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto overscroll-y-contain rounded-lg border border-input bg-popover py-1 shadow-md"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value.length === 0}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-base"
              onClick={() => onChange([])}
            >
              <Check
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0',
                  value.length === 0 ? 'opacity-100' : 'opacity-0',
                )}
              />
              {t.dailyEntry.eatingReasonNoneOption}
            </button>
          </li>
          {EATING_REASONS.map((reason) => {
            const selected = value.includes(reason)
            return (
              <li key={reason} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-base"
                  onClick={() => toggle(reason)}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {eatingReasonDisplayLabel(reason, t, builtinLabelOverrides)}
                </button>
              </li>
            )
          })}
          {listedCustoms.map((reason) => {
            const selected = value.includes(reason)
            return (
              <li key={reason} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-base"
                  onClick={() => toggle(reason)}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {reason}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
