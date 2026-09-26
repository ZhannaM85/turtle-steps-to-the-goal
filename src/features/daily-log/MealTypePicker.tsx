import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'

/**
 * #1002 — the meal-name slot is the dropdown (#1001's list: Breakfast /
 * Lunch / Dinner / Snack, plus Settings templates). Same closed affordance
 * as Why am I eating? (#774): current value and a chevron. Clearing (#845)
 * stays on this control and does not bring back a text field.
 */
export function MealTypePicker({
  id,
  value,
  options,
  onChange,
  hideLabel = false,
  className,
}: {
  id?: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  /** Header already shows «Название приёма пищи» above the name/time row. */
  hideLabel?: boolean
  className?: string
}) {
  const t = useTranslation()
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listId = `${fieldId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const trimmed = value.trim()
  const summary =
    trimmed === '' ? t.dailyEntry.mealTypeUnsetLabel : value
  const label = t.dailyEntry.mealLabelFieldLabel

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {!hideLabel && <Label htmlFor={fieldId}>{label}</Label>}
      <div className="relative">
        <button
          type="button"
          id={fieldId}
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className="flex h-12 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 md:text-sm"
          onClick={() => setOpen((current) => !current)}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              trimmed !== '' && 'pr-9',
            )}
          >
            {summary}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {trimmed !== '' && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t.dailyEntry.clearMealLabelFieldLabel}
            className="absolute top-1/2 right-9 -translate-y-1/2"
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="max-h-64 overflow-y-auto overscroll-y-contain rounded-lg border border-input bg-background py-1"
        >
          {options.map((name) => {
            const selected = value === name
            return (
              <li key={name} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-base"
                  onClick={() => choose(name)}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
