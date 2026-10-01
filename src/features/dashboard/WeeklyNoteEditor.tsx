import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { truncateDayNote } from '@/features/dashboard/dayNotePreview'
import { ConfirmDeleteEntryBar } from '@/features/daily-log/ConfirmDeleteEntryBar'
import { NoteEditRow } from '@/features/daily-log/NoteEditRow'
import { useWeeklyNoteStore } from '@/stores'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { Button } from '@/shared/ui/button'

const WEEKLY_NOTE_PREVIEW_MAX_CHARS = 80

export interface WeeklyNoteEditorProps {
  weekStart: string
}

/**
 * Per-week freeform note on Dashboard weekly recap (#557). Preview uses
 * the same truncate helper as day-note chips (#540). **#571**: long notes
 * toggle collapsed preview ↔ full text without requiring Edit.
 * **#1063**: editing uses the day-note row (save, cancel, confirmed delete).
 */
export function WeeklyNoteEditor({ weekStart }: WeeklyNoteEditorProps) {
  const t = useTranslation()
  const savedNote = useWeeklyNoteStore(
    (state) => state.notesByWeekStart[weekStart] ?? '',
  )
  const setNote = useWeeklyNoteStore((state) => state.setNote)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const truncated = truncateDayNote(savedNote, WEEKLY_NOTE_PREVIEW_MAX_CHARS)
  const isTruncated =
    Boolean(truncated) && truncated !== savedNote.trim()
  const previewText =
    isExpanded || !isTruncated ? savedNote.trim() : truncated

  function startEditing() {
    setDraft(savedNote)
    setIsConfirmingDelete(false)
    setIsEditing(true)
  }

  async function save() {
    await setNote(weekStart, draft)
    setIsEditing(false)
    setIsExpanded(false)
  }

  function cancel() {
    setDraft(savedNote)
    setIsConfirmingDelete(false)
    setIsEditing(false)
  }

  async function confirmDelete() {
    await setNote(weekStart, '')
    setDraft('')
    setIsConfirmingDelete(false)
    setIsEditing(false)
    setIsExpanded(false)
  }

  if (isConfirmingDelete) {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.dashboard.weeklyNoteLabel}</span>
        <ConfirmDeleteEntryBar
          label={t.dailyEntry.confirmDeleteNoteLabel}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <NoteEditRow
          label={t.dashboard.weeklyNoteLabel}
          textareaProps={{
            'aria-label': t.dashboard.weeklyNoteLabel,
            placeholder: t.dashboard.weeklyNotePlaceholder,
            value: draft,
            onChange: (event) => setDraft(event.target.value),
          }}
          saveLabel={t.dashboard.saveWeeklyNoteLabel}
          onSave={() => void save()}
          saveDisabled={isBlankSaveValue(draft)}
          cancelLabel={t.dashboard.cancelWeeklyNoteLabel}
          onCancel={cancel}
          hasSavedValue={savedNote.trim() !== ''}
          deleteLabel={t.dailyEntry.deleteNoteLabel}
          onDelete={() => setIsConfirmingDelete(true)}
        />
      </div>
    )
  }

  if (previewText) {
    return (
      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {previewText}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t.dashboard.editWeeklyNoteLabel}
            onClick={startEditing}
          >
            <Pencil aria-hidden="true" />
          </Button>
        </div>
        {isTruncated && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto self-start px-0 text-muted-foreground"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((open) => !open)}
          >
            {isExpanded
              ? t.dashboard.collapseWeeklyNoteLabel
              : t.dashboard.expandWeeklyNoteLabel}
          </Button>
        )}
      </div>
    )
  }

  // #565 — bottom-right inside the week card so the control reads as part
  // of that week, not a separate row on the section background.
  return (
    <div className="mt-2 flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-0 text-muted-foreground"
        onClick={startEditing}
      >
        {t.dashboard.addWeeklyNoteLabel}
      </Button>
    </div>
  )
}
