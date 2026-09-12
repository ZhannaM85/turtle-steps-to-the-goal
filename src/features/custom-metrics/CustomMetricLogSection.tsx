import { useEffect, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { CustomMetric } from '@/domain/customMetric'
import { useTranslation } from '@/i18n'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import {
  useCustomMetricNoteDismissalStore,
  useCustomMetricStore,
  useTodaySectionsCollapseStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ConfirmDeleteEntryBar } from '@/features/daily-log/ConfirmDeleteEntryBar'
import { NoteDisplayBlock, NoteEditRow } from '@/features/daily-log/NoteEditRow'

/** One metric's value-entry row for the given date (#336) — widget shape
 * depends on `metric.inputKind`: a plain number field, a Yes/No toggle
 * (stored as 1/0), or a 1-5 scale picker. All three commit straight to
 * `useCustomMetricStore.setEntryValue` — a `number` field commits on
 * blur/Enter (typing needs a chance to finish), the toggle/scale widgets
 * commit immediately on tap, same as this app's other single-tap pickers
 * (mood, reaction). */
function MetricValueRow({
  metric,
  date,
  entryId,
  value,
  note,
}: {
  metric: CustomMetric
  date: string
  entryId: string | undefined
  value: number | undefined
  note: string | undefined
}) {
  const t = useTranslation()
  const setEntryValue = useCustomMetricStore((state) => state.setEntryValue)
  const setEntryNote = useCustomMetricStore((state) => state.setEntryNote)
  const deleteEntry = useCustomMetricStore((state) => state.deleteEntry)
  // Lazy initializer, not a synced useEffect (the React Compiler's
  // react-hooks/set-state-in-effect lint rule flags calling setState
  // directly in an effect body) — the parent keys each row by
  // `${metric.id}:${date}`, so a date change remounts this component
  // fresh instead of needing an effect to reset `draft` on prop change.
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  const [noteDraft, setNoteDraft] = useState(note ?? '')
  const dismissalKey = `${metric.id}:${date}`
  const noteDismissed = useCustomMetricNoteDismissalStore((state) =>
    Boolean(state.dismissed[dismissalKey]),
  )
  const dismissNote = useCustomMetricNoteDismissalStore(
    (state) => state.dismiss,
  )
  // #364 reopened: reported live as still not matching the day note's own
  // read/edit toggle (`DailyEntryForm.tsx`) — a note with nothing saved yet
  // starts directly in edit mode (same `!initialValues.note` logic there),
  // an already-saved note starts in read mode with a pencil to reopen it.
  // #622: also check `noteDismissed` — an unsaved note and an explicitly
  // canceled one are otherwise indistinguishable (`note` is `undefined`
  // either way), so without this the editor reopened on every remount.
  const [isEditingNote, setIsEditingNote] = useState(!note && !noteDismissed)
  const [isConfirmingDeleteNote, setIsConfirmingDeleteNote] = useState(false)
  const [isConfirmingDeleteValue, setIsConfirmingDeleteValue] = useState(false)

  function commitNumber() {
    const parsed = Number(draft)
    if (draft.trim() === '' || Number.isNaN(parsed)) return
    setEntryValue(metric.id, date, parsed)
  }

  function saveNote() {
    if (isBlankSaveValue(noteDraft)) return
    setEntryNote(metric.id, date, noteDraft)
    setIsEditingNote(false)
  }

  // #437 — same #424 Cancel-without-saving affordance the day note
  // (DailyEntryForm.tsx) already got, applied here: reverts the local draft
  // back to the last-saved note and exits edit mode without persisting.
  function cancelEditNote() {
    // #622 — record the dismissal before an unsaved note goes back to
    // `undefined`, so a remount can't tell it apart from "never touched"
    // and reopen the editor. Only relevant when canceling a fresh note;
    // reverting edits to an already-saved one needs no such marker.
    if (!note) dismissNote(dismissalKey)
    setNoteDraft(note ?? '')
    setIsEditingNote(false)
  }

  function requestDeleteNote() {
    setIsConfirmingDeleteNote(true)
  }

  function cancelDeleteNote() {
    setIsConfirmingDeleteNote(false)
  }

  async function confirmDeleteNote() {
    await setEntryNote(metric.id, date, '')
    setIsConfirmingDeleteNote(false)
    setNoteDraft('')
    setIsEditingNote(false)
    dismissNote(dismissalKey)
  }

  function requestDeleteValue() {
    setIsConfirmingDeleteValue(true)
  }

  function cancelDeleteValue() {
    setIsConfirmingDeleteValue(false)
  }

  async function confirmDeleteValue() {
    if (!entryId) return
    await deleteEntry(entryId)
    setIsConfirmingDeleteValue(false)
    setDraft('')
    setNoteDraft('')
    setIsEditingNote(true)
  }

  if (isConfirmingDeleteValue) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2">
        <span className="text-sm font-medium">
          {metric.name}
          {metric.unit && (
            <span className="text-muted-foreground"> ({metric.unit})</span>
          )}
        </span>
        <ConfirmDeleteEntryBar
          onConfirm={() => {
            void confirmDeleteValue()
          }}
          onCancel={cancelDeleteValue}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          {metric.name}
          {metric.unit && (
            <span className="text-muted-foreground"> ({metric.unit})</span>
          )}
        </span>
        <div className="flex items-center gap-1">
        {metric.inputKind === 'number' && (
          <Input
            type="text"
            inputMode="decimal"
            aria-label={metric.name}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitNumber}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitNumber()
              }
            }}
            className="h-9 w-24 text-right"
          />
        )}
        {metric.inputKind === 'boolean' && (
          <ToggleGroup
            type="single"
            aria-label={metric.name}
            value={value === undefined ? undefined : value === 1 ? 'yes' : 'no'}
            onValueChange={(next) => {
              if (next) setEntryValue(metric.id, date, next === 'yes' ? 1 : 0)
            }}
          >
            <ToggleGroupItem value="no" className="text-sm">
              {t.customMetrics.booleanNoOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="yes" className="text-sm">
              {t.customMetrics.booleanYesOption}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        {metric.inputKind === 'scale5' && (
          <ToggleGroup
            type="single"
            aria-label={metric.name}
            value={value === undefined ? undefined : String(value)}
            onValueChange={(next) => {
              if (next) setEntryValue(metric.id, date, Number(next))
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <ToggleGroupItem
                key={n}
                value={String(n)}
                aria-label={t.customMetrics.scaleValueLabel(n)}
                className="w-9 text-sm"
              >
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {value !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t.customMetrics.deleteValueLabel}
            onClick={requestDeleteValue}
          >
            <X aria-hidden="true" />
          </Button>
        )}
        </div>
      </div>
      {/* #363 — only once a value for this day exists: a note has nowhere
       * to attach to otherwise, since `CustomMetricEntry.value` is required.
       * #364: reported live — blur-only commit gave no visible confirmation
       * the note was saved; then reopened, reported live again as still not
       * matching the day note's own read/edit-mode toggle. Now mirrors that
       * exactly: an already-saved note reads as plain text with a pencil to
       * reopen it, an unsaved one starts directly in edit mode. */}
      {value !== undefined &&
        (isConfirmingDeleteNote ? (
          <ConfirmDeleteEntryBar
            onConfirm={() => {
              void confirmDeleteNote()
            }}
            onCancel={cancelDeleteNote}
          />
        ) : isEditingNote ? (
          <NoteEditRow
            label={t.customMetrics.noteLabel}
            textareaProps={{
              'aria-label': t.customMetrics.noteLabel,
              placeholder: t.customMetrics.notePlaceholder,
              value: noteDraft,
              onChange: (e) => setNoteDraft(e.target.value),
            }}
            saveLabel={t.customMetrics.saveNoteLabel}
            onSave={saveNote}
            saveDisabled={isBlankSaveValue(noteDraft)}
            cancelLabel={t.customMetrics.cancelEditNoteLabel}
            onCancel={cancelEditNote}
            hasSavedValue={Boolean(note)}
            deleteLabel={t.customMetrics.deleteNoteLabel}
            onDelete={requestDeleteNote}
          />
        ) : note ? (
          <NoteDisplayBlock
            label={t.customMetrics.noteLabel}
            text={noteDraft}
            editLabel={t.customMetrics.editNoteLabel}
            onEdit={() => setIsEditingNote(true)}
            canDelete
            deleteLabel={t.customMetrics.deleteNoteLabel}
            onDelete={requestDeleteNote}
          />
        ) : (
          // #620 — nothing has ever been saved (a fresh note was opened,
          // typed into, then canceled): a real "nothing logged" idle
          // state, distinct from the read-mode box above, which is only
          // for an actual saved note — that box showing empty text used
          // to look like a blank note had been saved.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setIsEditingNote(true)}
          >
            <Plus aria-hidden="true" />
            {t.customMetrics.addNoteLabel}
          </Button>
        ))}
    </div>
  )
}

/**
 * Per-date custom-metric value entry (#336), mounted on `TodayScreen.tsx`
 * (#362) after Water and before Evening — kept as its **own** section
 * (#478), not folded into Morning or Evening, because custom metrics are
 * user-defined and mixed (many fit neither "scale/body first thing" nor
 * "end-of-day reflection"), and they already use a different store/model.
 * Defining/deleting metrics and correlations stay on
 * `CustomMetricsScreen.tsx` via Settings — only day values log here.
 * Renders nothing if no metrics are defined yet. **#478**: wrapped in the
 * same bordered `Collapsible` accordion Water (#476) / Meals / Macros use
 * (default open; collapsed header shows "N logged / M metrics").
 */
export function CustomMetricLogSection({ date }: { date: string }) {
  const t = useTranslation()
  const metrics = useCustomMetricStore((state) => state.metrics)
  const entries = useCustomMetricStore((state) => state.entries)
  const loadMetrics = useCustomMetricStore((state) => state.loadAll)
  // #478/#511 — accordion; collapse shared with Day Collapse all control.
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.customMetrics,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  if (metrics.length === 0) return null

  const loggedCount = metrics.filter((metric) =>
    entries.some(
      (e) =>
        e.metricId === metric.id && e.date === date && e.value !== undefined,
    ),
  ).length

  return (
    <section className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('customMetrics', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.customMetrics.expandLogValuesLabel
                : t.customMetrics.collapseLogValuesLabel
            }
            className="group flex w-full items-center justify-between gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
              <span>{t.customMetrics.logValuesSectionLabel}</span>
              {collapsed && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t.customMetrics.logValuesCollapsedSummary(
                    loggedCount,
                    metrics.length,
                  )}
                </span>
              )}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-2 pt-3">
            {metrics.map((metric) => {
              const entry = entries.find(
                (e) => e.metricId === metric.id && e.date === date,
              )
              return (
                <MetricValueRow
                  key={`${metric.id}:${date}`}
                  metric={metric}
                  date={date}
                  entryId={entry?.id}
                  value={entry?.value}
                  note={entry?.note}
                />
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
