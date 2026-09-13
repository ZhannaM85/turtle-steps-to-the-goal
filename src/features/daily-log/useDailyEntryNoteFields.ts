import { useState, type MutableRefObject } from 'react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { noteSchema, type DailyEntryFormValues } from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'

export type SavedNoteLikeFields = {
  note: string | undefined
  morningNote: string | undefined
  nightEatingReason: string | undefined
  nightEatingNoWhatHelped: string | undefined
}

type NoteLikeField =
  | 'note'
  | 'morningNote'
  | 'nightEatingReason'
  | 'nightEatingNoWhatHelped'

export function useDailyEntryNoteFields({
  alwaysEditable,
  initialValues,
  t,
  getValues,
  setValue,
  reset,
  setError,
  clearErrors,
  persist,
  persistWithCleared,
  savedNotesRef,
}: DailyEntryFormFieldApi & {
  persistWithCleared: (
    values: DailyEntryFormValues,
    cleared: Partial<DailyEntryFormValues>,
  ) => void
  savedNotesRef: MutableRefObject<SavedNoteLikeFields>
}) {
  const [isEditingNote, setIsEditingNote] = useState(
    alwaysEditable || !initialValues.note,
  )
  const [isEditingMorningNote, setIsEditingMorningNote] = useState(
    alwaysEditable || !initialValues.morningNote,
  )
  const [isEditingNightEatingReason, setIsEditingNightEatingReason] = useState(
    alwaysEditable || !initialValues.nightEatingReason,
  )
  const [isEditingNightEatingNoWhatHelped, setIsEditingNightEatingNoWhatHelped] =
    useState(alwaysEditable || !initialValues.nightEatingNoWhatHelped)
  const [savedNote, setSavedNote] = useState(initialValues.note)
  const [savedMorningNote, setSavedMorningNote] = useState(
    initialValues.morningNote,
  )
  const [savedNightEatingReason, setSavedNightEatingReason] = useState(
    initialValues.nightEatingReason,
  )
  const [savedNightEatingNoWhatHelped, setSavedNightEatingNoWhatHelped] =
    useState(initialValues.nightEatingNoWhatHelped)
  const [isConfirmingDeleteNote, setIsConfirmingDeleteNote] = useState(false)
  const [isConfirmingDeleteMorningNote, setIsConfirmingDeleteMorningNote] =
    useState(false)
  const [isConfirmingDeleteNightEatingReason, setIsConfirmingDeleteNightEatingReason] =
    useState(false)
  const [
    isConfirmingDeleteNightEatingNoWhatHelped,
    setIsConfirmingDeleteNightEatingNoWhatHelped,
  ] = useState(false)

  const showNoteAsDisplay = !alwaysEditable && !isEditingNote
  const showMorningNoteAsDisplay = !alwaysEditable && !isEditingMorningNote
  const showNightEatingReasonAsDisplay =
    !alwaysEditable && !isEditingNightEatingReason
  const showNightEatingNoWhatHelpedAsDisplay =
    !alwaysEditable && !isEditingNightEatingNoWhatHelped
  const canDeleteNote = Boolean(savedNote)
  const canDeleteMorningNote = Boolean(savedMorningNote)
  const canDeleteNightEatingReason = Boolean(savedNightEatingReason)
  const canDeleteNightEatingNoWhatHelped = Boolean(
    savedNightEatingNoWhatHelped,
  )

  function saveNoteLikeField(
    field: NoteLikeField,
    setSaved: (value: string | undefined) => void,
    setEditing: (editing: boolean) => void,
  ) {
    const raw = getValues(field)
    if (isBlankSaveValue(raw)) return
    const trimmed = typeof raw === 'string' ? raw.trim() : raw
    const result = noteSchema.safeParse(trimmed)
    if (!result.success) {
      setError(field, { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors(field)
    setValue(field, result.data, { shouldDirty: true })
    setSaved(result.data)
    savedNotesRef.current[field] = result.data
    setEditing(false)
    persist({ ...getValues(), [field]: result.data })
  }

  function cancelNoteLikeEdit(
    field: NoteLikeField,
    saved: string | undefined,
    setEditing: (editing: boolean) => void,
  ) {
    setValue(field, saved)
    clearErrors(field)
    if (alwaysEditable || Boolean(saved)) {
      setEditing(false)
    }
  }

  function confirmDeleteNoteLikeField(
    field: NoteLikeField,
    setSaved: (value: string | undefined) => void,
    setEditing: (editing: boolean) => void,
    setConfirming: (confirming: boolean) => void,
  ) {
    setSaved(undefined)
    savedNotesRef.current[field] = undefined
    setConfirming(false)
    const next = { ...getValues(), [field]: undefined }
    reset(next)
    persistWithCleared(next, { [field]: undefined })
    setEditing(true)
  }

  return {
    savedNote,
    savedMorningNote,
    savedNightEatingReason,
    savedNightEatingNoWhatHelped,
    showNoteAsDisplay,
    setIsEditingNote,
    saveNote: () => saveNoteLikeField('note', setSavedNote, setIsEditingNote),
    cancelEditNote: () =>
      cancelNoteLikeEdit('note', savedNote, setIsEditingNote),
    canDeleteNote,
    isConfirmingDeleteNote,
    requestDeleteNote: () => setIsConfirmingDeleteNote(true),
    confirmDeleteNote: () =>
      confirmDeleteNoteLikeField(
        'note',
        setSavedNote,
        setIsEditingNote,
        setIsConfirmingDeleteNote,
      ),
    cancelDeleteNote: () => setIsConfirmingDeleteNote(false),
    showMorningNoteAsDisplay,
    setIsEditingMorningNote,
    saveMorningNote: () =>
      saveNoteLikeField(
        'morningNote',
        setSavedMorningNote,
        setIsEditingMorningNote,
      ),
    cancelEditMorningNote: () =>
      cancelNoteLikeEdit(
        'morningNote',
        savedMorningNote,
        setIsEditingMorningNote,
      ),
    canDeleteMorningNote,
    isConfirmingDeleteMorningNote,
    requestDeleteMorningNote: () => setIsConfirmingDeleteMorningNote(true),
    confirmDeleteMorningNote: () =>
      confirmDeleteNoteLikeField(
        'morningNote',
        setSavedMorningNote,
        setIsEditingMorningNote,
        setIsConfirmingDeleteMorningNote,
      ),
    cancelDeleteMorningNote: () => setIsConfirmingDeleteMorningNote(false),
    showNightEatingReasonAsDisplay,
    setIsEditingNightEatingReason,
    saveNightEatingReason: () =>
      saveNoteLikeField(
        'nightEatingReason',
        setSavedNightEatingReason,
        setIsEditingNightEatingReason,
      ),
    cancelEditNightEatingReason: () =>
      cancelNoteLikeEdit(
        'nightEatingReason',
        savedNightEatingReason,
        setIsEditingNightEatingReason,
      ),
    canDeleteNightEatingReason,
    isConfirmingDeleteNightEatingReason,
    requestDeleteNightEatingReason: () =>
      setIsConfirmingDeleteNightEatingReason(true),
    confirmDeleteNightEatingReason: () =>
      confirmDeleteNoteLikeField(
        'nightEatingReason',
        setSavedNightEatingReason,
        setIsEditingNightEatingReason,
        setIsConfirmingDeleteNightEatingReason,
      ),
    cancelDeleteNightEatingReason: () =>
      setIsConfirmingDeleteNightEatingReason(false),
    showNightEatingNoWhatHelpedAsDisplay,
    setIsEditingNightEatingNoWhatHelped,
    saveNightEatingNoWhatHelped: () =>
      saveNoteLikeField(
        'nightEatingNoWhatHelped',
        setSavedNightEatingNoWhatHelped,
        setIsEditingNightEatingNoWhatHelped,
      ),
    cancelEditNightEatingNoWhatHelped: () =>
      cancelNoteLikeEdit(
        'nightEatingNoWhatHelped',
        savedNightEatingNoWhatHelped,
        setIsEditingNightEatingNoWhatHelped,
      ),
    canDeleteNightEatingNoWhatHelped,
    isConfirmingDeleteNightEatingNoWhatHelped,
    requestDeleteNightEatingNoWhatHelped: () =>
      setIsConfirmingDeleteNightEatingNoWhatHelped(true),
    confirmDeleteNightEatingNoWhatHelped: () =>
      confirmDeleteNoteLikeField(
        'nightEatingNoWhatHelped',
        setSavedNightEatingNoWhatHelped,
        setIsEditingNightEatingNoWhatHelped,
        setIsConfirmingDeleteNightEatingNoWhatHelped,
      ),
    cancelDeleteNightEatingNoWhatHelped: () =>
      setIsConfirmingDeleteNightEatingNoWhatHelped(false),
  }
}
