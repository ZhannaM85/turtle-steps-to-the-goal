import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

function isNightFoodMealLabel(mealLabel: string) {
  const normalized = mealLabel.trim().toLowerCase()
  return normalized === 'ночная еда' || normalized === 'night food'
}

/**
 * #1059 — a night-food note starts as a pencil while empty, and stays an
 * open field once it has text or the pencil is tapped. Other meals keep
 * the always-visible note field.
 */
export function AddMealNoteField({
  mealLabel,
  note,
  onNoteChange,
}: {
  mealLabel: string
  note: string
  onNoteChange: (value: string) => void
}) {
  const t = useTranslation()
  const night = isNightFoodMealLabel(mealLabel)
  const nightCopy = t.dailyEntry.mealNotePlaceholder(mealLabel)
  const label = night ? nightCopy : t.dailyEntry.mealNoteLabel
  const placeholder = night ? nightCopy : t.dailyEntry.mealNotePlaceholder(mealLabel)
  const [opened, setOpened] = useState(() => note.trim() !== '')
  const openedByUser = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const showInput = !night || opened || note.trim() !== ''

  useEffect(() => {
    if (openedByUser.current) inputRef.current?.focus()
  }, [opened])

  if (!showInput) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-touch"
        className="self-start"
        aria-label={label}
        onClick={() => {
          openedByUser.current = true
          setOpened(true)
        }}
      >
        <Pencil aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      aria-label={label}
      placeholder={placeholder}
      value={note}
      onChange={(event) => onNoteChange(event.target.value)}
      className="h-12 text-base"
    />
  )
}
