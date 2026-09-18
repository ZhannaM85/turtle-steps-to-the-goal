import { useEffect, useRef, useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { Input } from '@/shared/ui/input'
import { filterBrandSuggestions } from './brandSuggestions'
import { useBrandSuggestions } from './useBrandSuggestions'

export interface BrandAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  ariaLabel: string
  placeholder: string
  className?: string
  listInputId?: string
  mealItems?: readonly MealItem[]
  /** When false, skip scanning meal history (sheet closed). */
  enabled?: boolean
  /** Override for tests; omit in the add-meal sheet to use stored brands. */
  suggestions?: string[]
}

/**
 * Typeahead over brands the user already stored (#969) — same combobox
 * pattern as `MealNoteAutocomplete` (#86), not a native datalist.
 */
export function BrandAutocomplete({
  value,
  onChange,
  onSubmit,
  ariaLabel,
  placeholder,
  className,
  listInputId = 'item-editor-dish-brand',
  mealItems,
  enabled = true,
  suggestions: suggestionsProp,
}: BrandAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useBrandSuggestions(mealItems ?? [], enabled)
  const suggestions = suggestionsProp ?? loaded
  const matches = filterBrandSuggestions(suggestions, value)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={listInputId}
        name={listInputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={true}
        enterKeyHint="done"
        inputMode="text"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
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
          {matches.map((brand) => (
            <li key={brand.toLowerCase()}>
              <button
                type="button"
                className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(brand)
                  setIsOpen(false)
                }}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
