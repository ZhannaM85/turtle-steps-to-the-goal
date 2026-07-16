import { useEffect, useRef, useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { Input } from '@/shared/ui/input'

export interface MealNoteAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  suggestions: MealItem[]
  ariaLabel: string
  placeholder: string
  listInputId: string
  className?: string
  /** Fires alongside onChange when a suggestion is clicked, handing back
   * the full matched MealItem (#94) — lets callers restore its
   * lastAmountKcal/lastProteinG/lastFatG/lastCarbsG too, not just the name
   * onChange alone provides. */
  onSelectItem?: (item: MealItem) => void
}

/**
 * Replaces the native `<input list="...">` + `<datalist>` autocomplete
 * (#50) with a hand-rolled dropdown (#86) — iOS Safari has a long-standing
 * WebKit limitation where `<datalist>` suggestion popups often don't
 * render for text inputs at all, so the meal-name suggestions were
 * silently non-functional there.
 */
export function MealNoteAutocomplete({
  value,
  onChange,
  onSubmit,
  suggestions,
  ariaLabel,
  placeholder,
  listInputId,
  className,
  onSelectItem,
}: MealNoteAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const query = value.trim().toLowerCase()
  const matches = query
    ? suggestions.filter((item) => item.name.toLowerCase().includes(query))
    : suggestions

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        id={listInputId}
        type="text"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setIsOpen(false)
            onSubmit()
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={className}
      />
      {isOpen && matches.length > 0 && (
        <ul className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(item.name)
                  onSelectItem?.(item)
                  setIsOpen(false)
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
