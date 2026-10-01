import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { Button } from '@/shared/ui/button'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import { NoteDisplayBlock, NoteEditRow } from './NoteEditRow'

/**
 * #1063 — the one note cycle: collapsed pencil when nothing is saved,
 * `NoteEditRow` (✓ / × on the title row) while editing, `NoteDisplayBlock`
 * after save. Cancel restores the last saved text and collapses when
 * that text is empty. Blank drafts cannot save.
 */
export function NoteEditor({
  label,
  placeholder,
  value,
  onSave,
  saveLabel,
  cancelLabel,
  editLabel,
  deleteLabel,
  confirmDeleteLabel,
}: {
  label: string
  placeholder?: string
  value: string
  onSave: (next: string) => void
  saveLabel: string
  cancelLabel: string
  editLabel: string
  deleteLabel: string
  confirmDeleteLabel: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const saved = value.trim()

  useEffect(() => {
    if (editing) fieldRef.current?.focus()
  }, [editing])

  function open() {
    setDraft(value)
    setConfirmingDelete(false)
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onSave(trimmed)
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    setConfirmingDelete(false)
    setEditing(false)
  }

  function confirmDelete() {
    onSave('')
    setDraft('')
    setConfirmingDelete(false)
    setEditing(false)
  }

  if (confirmingDelete) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <ConfirmDeleteEntryBar
          label={confirmDeleteLabel}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      </div>
    )
  }

  if (!editing && saved === '') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-touch"
        className="self-start"
        aria-label={label}
        onClick={open}
      >
        <Pencil aria-hidden="true" />
      </Button>
    )
  }

  if (!editing) {
    return (
      <NoteDisplayBlock
        label={label}
        text={saved}
        editLabel={editLabel}
        onEdit={open}
        canDelete
        deleteLabel={deleteLabel}
        onDelete={() => setConfirmingDelete(true)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <NoteEditRow
        label={label}
        textareaProps={{
          ref: fieldRef,
          'aria-label': label,
          placeholder,
          value: draft,
          onChange: (event) => setDraft(event.target.value),
        }}
        saveLabel={saveLabel}
        onSave={save}
        saveDisabled={isBlankSaveValue(draft)}
        cancelLabel={cancelLabel}
        onCancel={cancel}
        hasSavedValue={saved !== ''}
        deleteLabel={deleteLabel}
        onDelete={() => setConfirmingDelete(true)}
      />
    </div>
  )
}
