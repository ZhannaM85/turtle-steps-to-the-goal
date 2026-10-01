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
 * delete). Adding any other meal keeps an always-visible field.
 * #1064 — editing a meal keeps that note collapsed and unfocused until
 * the pencil.
 */
export function AddMealNoteField({
  mealLabel,
  note,
  onNoteChange,
  collapseUntilPencil = false,
}: {
  mealLabel: string
  note: string
  onNoteChange: (value: string) => void
  collapseUntilPencil?: boolean
}) {
  const t = useTranslation()
  const night = isNightFoodMealLabel(mealLabel)
  const mealCopy = t.dailyEntry.mealNotePlaceholder(mealLabel)
  const useEditor = night || collapseUntilPencil
  const label = useEditor ? mealCopy : t.dailyEntry.mealNoteLabel
  const placeholder = mealCopy

  if (useEditor) {
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
