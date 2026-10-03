import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import {
  dayNoteDismissalKey,
  useDayNoteDismissalStore,
  type DayNoteDismissalField,
} from '@/stores'
import { noteSchema, type DailyEntryFormValues } from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'

export type SavedNoteLikeFields = {
  note: string | undefined
  morningNote: string | undefined
  nightEatingReason: string | undefined
  nightEatingNoWhatHelped: string | undefined
}

type NoteLikeField = DayNoteDismissalField

function emptyNoteStartsOpen(
  alwaysEditable: boolean,
  date: string,
  field: NoteLikeField,
  saved: string | undefined,
) {
  if (alwaysEditable) return true
  if (!isBlankSaveValue(saved)) return false
  return (
    useDayNoteDismissalStore.getState().dismissed[
      dayNoteDismissalKey(date, field)
    ] !== true
  )
}

export function useDailyEntryNoteFields({
  alwaysEditable,
  date,
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
  date: string
  persistWithCleared: (
    values: DailyEntryFormValues,
    cleared: Partial<DailyEntryFormValues>,
  ) => void
  savedNotesRef: MutableRefObject<SavedNoteLikeFields>
}) {
  const [isEditingNote, setIsEditingNote] = useState(() =>
    emptyNoteStartsOpen(alwaysEditable, date, 'note', initialValues.note),
  )
  const [isEditingMorningNote, setIsEditingMorningNote] = useState(() =>
    emptyNoteStartsOpen(
      alwaysEditable,
      date,
      'morningNote',
      initialValues.morningNote,
    ),
  )
  const [isEditingNightEatingReason, setIsEditingNightEatingReason] = useState(
    () =>
      emptyNoteStartsOpen(
        alwaysEditable,
        date,
        'nightEatingReason',
        initialValues.nightEatingReason,
      ),
  )
  const [
    isEditingNightEatingNoWhatHelped,
    setIsEditingNightEatingNoWhatHelped,
  ] = useState(() =>
    emptyNoteStartsOpen(
      alwaysEditable,
      date,
      'nightEatingNoWhatHelped',
      initialValues.nightEatingNoWhatHelped,
    ),
  )
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
  const dismissedNotes = useDayNoteDismissalStore((state) => state.dismissed)
  const dismissedNotesRef = useRef(dismissedNotes)

  // #1080 — close only when this field's skip flips on (hydration or ×).
  // A later skip of a sibling note must not collapse one the user reopened.
  useEffect(() => {
    const previous = dismissedNotesRef.current
    dismissedNotesRef.current = dismissedNotes
    if (alwaysEditable) return
    const fields: Array<{
      field: NoteLikeField
      saved: string | undefined
      close: () => void
    }> = [
      { field: 'note', saved: initialValues.note, close: () => setIsEditingNote(false) },
      {
        field: 'morningNote',
        saved: initialValues.morningNote,
        close: () => setIsEditingMorningNote(false),
      },
      {
        field: 'nightEatingReason',
        saved: initialValues.nightEatingReason,
        close: () => setIsEditingNightEatingReason(false),
      },
      {
        field: 'nightEatingNoWhatHelped',
        saved: initialValues.nightEatingNoWhatHelped,
        close: () => setIsEditingNightEatingNoWhatHelped(false),
      },
    ]
    for (const item of fields) {
      const key = dayNoteDismissalKey(date, item.field)
      if (
        dismissedNotes[key] === true &&
        previous[key] !== true &&
        isBlankSaveValue(item.saved)
      ) {
        item.close()
      }
    }
  }, [alwaysEditable, date, dismissedNotes, initialValues])

  const showNoteAsDisplay = !alwaysEditable && !isEditingNote
  const showMorningNoteAsDisplay = !alwaysEditable && !isEditingMorningNote
  const showNightEatingReasonAsDisplay =
    !alwaysEditable && !isEditingNightEatingReason
  const showNightEatingNoWhatHelpedAsDisplay =
    !alwaysEditable && !isEditingNightEatingNoWhatHelped
  const canDeleteNote = !isBlankSaveValue(savedNote)
  const canDeleteMorningNote = !isBlankSaveValue(savedMorningNote)
  const canDeleteNightEatingReason = !isBlankSaveValue(savedNightEatingReason)
  const canDeleteNightEatingNoWhatHelped = !isBlankSaveValue(
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
    const savedValue = isBlankSaveValue(saved) ? undefined : saved
    // '' clears a whitespace draft in the form. Persist still drops blanks,
    // so × does not write an empty string onto the day.
    setValue(field, savedValue ?? '')
    clearErrors(field)
    setEditing(false)
    if (!alwaysEditable && savedValue === undefined) {
      useDayNoteDismissalStore
        .getState()
        .dismiss(dayNoteDismissalKey(date, field))
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
    useDayNoteDismissalStore
      .getState()
      .restore(dayNoteDismissalKey(date, field))
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
