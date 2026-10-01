import { useTranslation } from '@/i18n'
import { NoteEditor } from './NoteEditor'

/**
 * #1059 — a night-food note starts as a pencil while empty.
 * #1063 — opening it uses the day-note editor (save, cancel, confirmed
 * delete).
 * #1064 — editing a meal keeps that note collapsed and unfocused until
 * the pencil.
 * #1065 — every meal type, including a new Snack, uses that same cycle.
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
  const mealCopy = t.dailyEntry.mealNotePlaceholder(mealLabel)
  const label = mealCopy
  const placeholder = mealCopy

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
