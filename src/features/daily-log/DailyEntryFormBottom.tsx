import { Check, Moon, Pencil } from 'lucide-react'
import { formatNumber } from '@/i18n'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { EmotionPicker } from './EmotionPicker'
import type { DailyEntryFormState } from './useDailyEntryFormState'

/**
 * #416 — the "Evening entries" group (Steps/Note/Mood/Constipation/Night
 * eating, #404), split out of `DailyEntryForm.tsx` so `TodayScreen.tsx`
 * can render it *after* `CustomMetricLogSection`, while `DailyEntryFormTop`
 * (Morning group + Meals + Water) renders before it — both halves share
 * the same live form state via `useDailyEntryFormState`. `DailyEntryForm.tsx`
 * (the combined default, used by History's `EntryRow.tsx`) renders this
 * immediately after `DailyEntryFormTop`, unchanged from before this split.
 */
export function DailyEntryFormBottom({
  state,
}: {
  state: DailyEntryFormState
}) {
  const { t, locale } = state

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Moon aria-hidden="true" className="size-4" />
          {t.dailyEntry.eveningEntriesTitle}
        </span>
        <span className="text-xs text-muted-foreground">
          {t.dailyEntry.eveningEntriesSubtitle}
        </span>
      </div>

      {state.trackedFields.steps &&
        (state.showStepsAsDisplay ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.stepsLabel}
            </span>
            <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
              <span className="text-sm text-foreground">
                {state.steps === undefined
                  ? '—'
                  : formatNumber(state.steps, locale, 0)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xl"
                aria-label={t.dailyEntry.editStepsLabel}
                onClick={() => state.setIsEditingSteps(true)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.stepsLabel}
            </span>
            <div className="flex items-center gap-3">
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
              <Button
                type="button"
                variant="outline"
                size="icon-xl"
                aria-label={t.dailyEntry.saveStepsLabel}
                onClick={state.saveSteps}
              >
                <Check aria-hidden="true" />
              </Button>
            </div>
            {state.errors.steps && (
              <p className="text-sm text-destructive">
                {state.errors.steps.message}
              </p>
            )}
          </div>
        ))}

      {state.trackedFields.note &&
        (state.showNoteAsDisplay ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.noteLabel}
            </span>
            {/* #189: min-h-12, not a fixed h-12 — a long note wraps to
             * multiple lines, and the fixed-height version didn't grow to
             * fit, so the edit button (vertically centered against the old,
             * too-short box) ended up overlapping the wrapped text instead
             * of sitting clear of it. With only a floor height, a short
             * single-line note still renders at the same 48px (the icon-xl
             * button's own 44px + this row's centering keeps it there),
             * while a long one grows the row to fit and items-center still
             * centers the button against the full wrapped height. */}
            <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {state.note}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xl"
                aria-label={t.dailyEntry.editNoteLabel}
                onClick={() => state.setIsEditingNote(true)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.noteLabel}
            </span>
            <div className="flex items-end gap-3">
              {/* #417 — auto-growing textarea, not the single-line Input the
               * other fields use: a longer note needs to be readable while
               * editing, not scrolled sideways in a fixed-height row. Enter
               * now inserts a newline (the textarea default) instead of
               * submitting — with multi-line content expected, Ctrl/Cmd
               * hijacking Enter to save would fight normal text editing. */}
              <Textarea
                aria-label={t.dailyEntry.noteLabel}
                aria-invalid={state.errors.note ? true : undefined}
                placeholder={t.dailyEntry.noteFieldPlaceholder}
                className="flex-1"
                {...state.register('note')}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-xl"
                aria-label={t.dailyEntry.saveNoteLabel}
                onClick={state.saveNote}
              >
                <Check aria-hidden="true" />
              </Button>
            </div>
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

      {/* #383 — always shown (no Settings opt-in gate, unlike onPeriod/
       * hadConstipation above): a manually-set override layered on a value
       * already derived from today's own logged meal times, so there's no
       * extra logging step for anyone already recording when they eat. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          <Moon aria-hidden="true" className="mr-1 inline size-4" />
          {t.dailyEntry.nightEatingLabel(state.sex)}
        </span>
        <ToggleGroup
          type="single"
          aria-label={t.dailyEntry.nightEatingLabel(state.sex)}
          value={
            state.nightEatingEffective === undefined
              ? undefined
              : state.nightEatingEffective
                ? 'yes'
                : 'no'
          }
          onValueChange={(value) =>
            state.setNightEatingOverride(
              value === '' ? undefined : value === 'yes',
            )
          }
          className="w-fit"
        >
          <ToggleGroupItem value="no" className="h-12 px-6 text-base">
            {t.dailyEntry.nightEatingNoOption}
          </ToggleGroupItem>
          <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
            {t.dailyEntry.nightEatingYesOption}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
