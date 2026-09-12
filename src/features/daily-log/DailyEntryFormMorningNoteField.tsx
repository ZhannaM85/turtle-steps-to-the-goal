import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { NoteDisplayBlock, NoteEditRow } from './NoteEditRow'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/** Morning-note field extracted from DailyEntryFormMorning (#864). */
export function DailyEntryFormMorningNoteField() {
  const state = useDailyEntryFormStateContext()
  const { t } = state

  return (
    <>
            {state.trackedFields.morningNote &&
              (state.isConfirmingDeleteMorningNote ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.morningNoteLabel}
                  </span>
                  <ConfirmDeleteEntryBar
                    onConfirm={state.confirmDeleteMorningNote}
                    onCancel={state.cancelDeleteMorningNote}
                  />
                </div>
              ) : state.showMorningNoteAsDisplay ? (
                <NoteDisplayBlock
                  label={t.dailyEntry.morningNoteLabel}
                  text={state.morningNote}
                  editLabel={t.dailyEntry.editMorningNoteLabel}
                  onEdit={() => state.setIsEditingMorningNote(true)}
                  canDelete={state.canDeleteMorningNote}
                  deleteLabel={t.dailyEntry.deleteMorningNoteLabel}
                  onDelete={state.requestDeleteMorningNote}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <NoteEditRow
                    label={t.dailyEntry.morningNoteLabel}
                    textareaProps={{
                      'aria-label': t.dailyEntry.morningNoteLabel,
                      'aria-invalid': state.errors.morningNote
                        ? true
                        : undefined,
                      placeholder: t.dailyEntry.morningNoteFieldPlaceholder,
                      ...state.register('morningNote'),
                    }}
                    saveLabel={t.dailyEntry.saveMorningNoteLabel}
                    onSave={state.saveMorningNote}
                    saveDisabled={isBlankSaveValue(state.morningNote)}
                    cancelLabel={t.dailyEntry.cancelEditMorningNoteLabel}
                    onCancel={state.cancelEditMorningNote}
                    hasSavedValue={state.canDeleteMorningNote}
                    deleteLabel={t.dailyEntry.deleteMorningNoteLabel}
                    onDelete={state.requestDeleteMorningNote}
                  />
                  {state.errors.morningNote && (
                    <p className="text-sm text-destructive">
                      {state.errors.morningNote.message}
                    </p>
                  )}
                </div>
              ))}
    </>
  )
}
