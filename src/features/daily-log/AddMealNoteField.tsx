import { useTranslation } from '@/i18n'
import { Input } from '@/shared/ui/input'
import { NoteEditor } from './NoteEditor'

function isNightFoodMealLabel(mealLabel: string) {
  const normalized = mealLabel.trim().toLowerCase()
  return normalized === 'ночная еда' || normalized === 'night food'
}

/**
 * #1059 — a night-food note starts as a pencil while empty.
 * #1063 — opening it uses the day-note editor (save, cancel, confirmed
 * delete). Other meals stay an always-visible field saved with the meal.
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

  if (night) {
    return (
      <NoteEditor
        label={label}
        placeholder={placeholder}
        value={note}
        onSave={onNoteChange}
        saveLabel={t.dailyEntry.saveNoteLabel}
        cancelLabel={t.dailyEntry.cancelEditNoteLabel}
        editLabel={t.dailyEntry.editNoteLabel}
        deleteLabel={t.dailyEntry.deleteNoteLabel}
        confirmDeleteLabel={t.dailyEntry.confirmDeleteNoteLabel}
      />
    )
  }

  return (
    <Input
      type="text"
      aria-label={label}
      placeholder={placeholder}
      value={note}
      onChange={(event) => onNoteChange(event.target.value)}
      className="h-12 text-base"
    />
  )
}
