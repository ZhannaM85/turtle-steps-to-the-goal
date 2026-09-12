import { ChevronDown, Moon } from 'lucide-react'
import { formatNumber } from '@/i18n'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useTodaySectionsCollapseStore } from '@/stores'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import {
  DayFieldHeader,
  DayFieldHeaderCancelButton,
  DayFieldHeaderSaveButton,
  DayFieldViewActions,
} from './DayFieldHeader'
import { EmotionPicker } from './EmotionPicker'
import { NoteDisplayBlock, NoteEditRow } from './NoteEditRow'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #416 — the "Evening entries" group (Steps/Note/Mood/Constipation/Night
 * eating, #404), split out of `DailyEntryForm.tsx` so `TodayScreen.tsx`
 * can render it *after* `CustomMetricLogSection`, while `DailyEntryFormTop`
 * (Meals + Water) and `DailyEntryFormMorning` (#419) render before it —
 * all three read the same live form state via `DailyEntryFormStateContext`.
 * `DailyEntryForm.tsx` (the combined default, used by History's
 * `EntryRow.tsx`) renders this last, immediately after `DailyEntryFormTop`,
 * unchanged from before this split.
 */
export function DailyEntryFormBottom() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  // #472/#511 — accordion; collapse shared with Day Collapse all control.
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.evening,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  // #532 — if every Evening field is off, don't leave an empty accordion.
  const showEveningSection =
    state.trackedFields.steps ||
    state.trackedFields.note ||
    state.trackedFields.mood ||
    state.digestionTrackingEnabled ||
    state.alcoholTrackingEnabled

  if (!showEveningSection) return null

  const comparison = state.entryComparisonBaselines

  return (
    <div className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('evening', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandEveningEntriesLabel
                : t.dailyEntry.collapseEveningEntriesLabel
            }
            className="group flex w-full flex-col gap-0.5 text-left"
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Moon aria-hidden="true" className="size-4" />
                {t.dailyEntry.eveningEntriesTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.eveningEntriesSubtitle}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-4">
            {state.trackedFields.steps &&
              (state.isConfirmingDeleteSteps ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.stepsLabel}
                  </span>
                  <ConfirmDeleteEntryBar
                    onConfirm={state.confirmDeleteSteps}
                    onCancel={state.cancelDeleteSteps}
                  />
                </div>
              ) : state.showStepsAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={
                      <>
                        {t.dailyEntry.stepsLabel}
                        <EntryFieldComparisonInfo
                          field="steps"
                          currentValue={state.steps}
                          prior={comparison.prior('steps')}
                          day30Value={comparison.day30Value('steps')}
                          unit="none"
                        />
                      </>
                    }
                    actions={
                      <DayFieldViewActions
                        editLabel={t.dailyEntry.editStepsLabel}
                        onEdit={() => state.setIsEditingSteps(true)}
                        deleteLabel={t.dailyEntry.deleteStepsLabel}
                        onDelete={state.requestDeleteSteps}
                        showDelete={state.canDeleteSteps}
                      />
                    }
                  />
                  <div className="flex h-12 items-center rounded-lg bg-muted px-3">
                    <span className="text-sm text-foreground">
                      {state.steps === undefined
                        ? '—'
                        : formatNumber(state.steps, locale, 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.stepsLabel}
                    actions={
                      <>
                        <DayFieldHeaderSaveButton
                          label={t.dailyEntry.saveStepsLabel}
                          onClick={state.saveSteps}
                          disabled={isBlankSaveValue(state.steps)}
                        />
                        {/* #855 — × on a saved value means delete (with
                         * confirm); × on an unsaved draft still cancels. */}
                        {(state.canDeleteSteps ||
                          state.canCancelStepsEdit) && (
                          <DayFieldHeaderCancelButton
                            label={
                              state.canDeleteSteps
                                ? t.dailyEntry.deleteStepsLabel
                                : t.dailyEntry.cancelEditStepsLabel
                            }
                            onClick={
                              state.canDeleteSteps
                                ? state.requestDeleteSteps
                                : state.cancelEditSteps
                            }
                          />
                        )}
                      </>
                    }
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label={t.dailyEntry.stepsLabel}
                    aria-invalid={state.errors.steps ? true : undefined}
                    className="h-12 w-24"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        state.saveSteps()
                      }
                    }}
                    {...state.register('steps', {
                      setValueAs: parseNumberInput,
                    })}
                  />
                  <EntryFieldComparisonLive
                    field="steps"
                    currentValue={state.steps}
                    prior={comparison.prior('steps')}
                    unit="none"
                  />
                  {state.errors.steps && (
                    <p className="text-sm text-destructive">
                      {state.errors.steps.message}
                    </p>
                  )}
                </div>
              ))}

            {state.trackedFields.note &&
              (state.isConfirmingDeleteNote ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.noteLabel}
                  </span>
                  <ConfirmDeleteEntryBar
                    onConfirm={state.confirmDeleteNote}
                    onCancel={state.cancelDeleteNote}
                  />
                </div>
              ) : state.showNoteAsDisplay ? (
                <NoteDisplayBlock
                  label={t.dailyEntry.noteLabel}
                  text={state.note}
                  editLabel={t.dailyEntry.editNoteLabel}
                  onEdit={() => state.setIsEditingNote(true)}
                  canDelete={state.canDeleteNote}
                  deleteLabel={t.dailyEntry.deleteNoteLabel}
                  onDelete={state.requestDeleteNote}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {/* #417 / #850 / #858 — full-width note; ✓ / × on the
                   * title row (shared with morning note and Night food). */}
                  <NoteEditRow
                    label={t.dailyEntry.noteLabel}
                    textareaProps={{
                      'aria-label': t.dailyEntry.noteLabel,
                      'aria-invalid': state.errors.note ? true : undefined,
                      placeholder: t.dailyEntry.noteFieldPlaceholder,
                      ...state.register('note'),
                    }}
                    saveLabel={t.dailyEntry.saveNoteLabel}
                    onSave={state.saveNote}
                    saveDisabled={isBlankSaveValue(state.note)}
                    cancelLabel={t.dailyEntry.cancelEditNoteLabel}
                    onCancel={state.cancelEditNote}
                    hasSavedValue={state.canDeleteNote}
                    deleteLabel={t.dailyEntry.deleteNoteLabel}
                    onDelete={state.requestDeleteNote}
                  />
                  {state.errors.note && (
                    <p className="text-sm text-destructive">
                      {state.errors.note.message}
                    </p>
                  )}
                </div>
              ))}

            {/* #237: promoted from a sub-row inside the note's edit block to its
             * own standalone, always-interactive field (a single-tap picker, no
             * edit/display toggle needed) — independently toggleable from Note
             * now that both have their own opt-out in Settings. */}
            {state.trackedFields.mood && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.dayMoodLabel}
                </span>
                <EmotionPicker
                  value={state.dayEmotion}
                  onChange={state.saveMood}
                  options={DAY_EMOTIONS}
                  labelFor={t.dailyEntry.emotionLabel}
                  contextLabel={t.dailyEntry.dayMoodLabel}
                />
              </div>
            )}

            {/* Surfaced directly on Today (previously only reachable via
             * History's DayDetail, which users found hard to discover) — both
             * options are always shown rather than a single unlabeled toggle, so
             * the current state reads unambiguously without relying on a
             * highlight color alone. */}
            {state.digestionTrackingEnabled && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.hadConstipationLabel}
                </span>
                <ToggleGroup
                  type="single"
                  aria-label={t.dailyEntry.hadConstipationLabel}
                  value={state.hadConstipation ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    value && state.setHadConstipation(value === 'yes')
                  }
                  className="w-fit"
                >
                  <ToggleGroupItem value="no" className="h-12 px-6 text-base">
                    {t.dailyEntry.hadConstipationNoOption}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
                    {t.dailyEntry.hadConstipationYesOption}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {/* #607 — opt-in alcohol day signal, same Settings-gated shape
             * as digestion tracking above. */}
            {state.alcoholTrackingEnabled && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.hadAlcoholLabel}
                </span>
                <ToggleGroup
                  type="single"
                  aria-label={t.dailyEntry.hadAlcoholLabel}
                  value={state.hadAlcohol ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    value && state.setHadAlcohol(value === 'yes')
                  }
                  className="w-fit"
                >
                  <ToggleGroupItem value="no" className="h-12 px-6 text-base">
                    {t.dailyEntry.hadAlcoholNoOption}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
                    {t.dailyEntry.hadAlcoholYesOption}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
