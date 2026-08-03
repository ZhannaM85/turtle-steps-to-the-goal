import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { truncateDayNote } from '@/features/dashboard/dayNotePreview'
import { useWeeklyNoteStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

const WEEKLY_NOTE_PREVIEW_MAX_CHARS = 80

export interface WeeklyNoteEditorProps {
  weekStart: string
}

/**
 * Per-week freeform note on Dashboard weekly recap (#557) — edit opens a
 * textarea; empty saves delete the row. Preview uses the same truncate
 * helper as day-note chips (#540). **#571**: long notes toggle collapsed
 * preview ↔ full text without requiring Edit.
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

  const truncated = truncateDayNote(savedNote, WEEKLY_NOTE_PREVIEW_MAX_CHARS)
  const isTruncated =
    Boolean(truncated) && truncated !== savedNote.trim()
  const previewText =
    isExpanded || !isTruncated ? savedNote.trim() : truncated

  function startEditing() {
    setDraft(savedNote)
    setIsEditing(true)
  }

  async function save() {
    await setNote(weekStart, draft)
    setIsEditing(false)
    setIsExpanded(false)
  }

  function cancel() {
    setDraft(savedNote)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <Textarea
          aria-label={t.dashboard.weeklyNoteLabel}
          placeholder={t.dashboard.weeklyNotePlaceholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t.dashboard.saveWeeklyNoteLabel}
            onClick={() => void save()}
          >
            <Check aria-hidden="true" />
            {t.dashboard.saveWeeklyNoteLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t.dashboard.cancelWeeklyNoteLabel}
            onClick={cancel}
          >
            <X aria-hidden="true" />
            {t.dashboard.cancelWeeklyNoteLabel}
          </Button>
        </div>
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
