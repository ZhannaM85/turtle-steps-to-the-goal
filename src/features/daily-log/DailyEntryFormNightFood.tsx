import { ChevronDown, Moon, Pencil } from 'lucide-react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useTodaySectionsCollapseStore } from '@/stores'
import { NoteEditRow } from './NoteEditRow'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #818 — Night food as its own Day card (Yes/No + remember + reason),
 * not nested under Evening. Still gated by Settings night-eating tracking.
 * #825 — remember + reason only when Yes; hidden when No or unset.
 * #835 / #842 — No path has its own follow-ups (was it easy? / what helped?).
 * #831 — same accordion as Evening (chevron + Collapse all).
 */
export function DailyEntryFormNightFood() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  const collapsed = useTodaySectionsCollapseStore((s) => s.sections.nightFood)
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  if (!state.trackedFields.nightEating) return null

  return (
    <div className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('nightFood', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandNightFoodCardLabel
                : t.dailyEntry.collapseNightFoodCardLabel
            }
            className="group flex w-full flex-col gap-0.5 text-left"
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Moon aria-hidden="true" className="size-4" />
                {t.dailyEntry.nightFoodCardTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.nightFoodCardHint(state.sex)}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-4">
        <ToggleGroup
          type="single"
          aria-label={t.dailyEntry.nightEatingLabel(state.sex)}
          value={
            state.nightEatingOverride === undefined
              ? ''
              : state.nightEatingOverride
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

        {state.nightEatingOverride === true && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {t.dailyEntry.nightEatingRememberLabel(state.sex)}
              </span>
              <ToggleGroup
                type="single"
                aria-label={t.dailyEntry.nightEatingRememberLabel(state.sex)}
                value={state.nightEatingRemember ?? ''}
                onValueChange={(value) =>
                  state.setNightEatingRemember(
                    value === ''
                      ? undefined
                      : value === 'yes' ||
                          value === 'partial' ||
                          value === 'no'
                        ? value
                        : undefined,
                  )
                }
                className="w-fit"
              >
                <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
                  {t.dailyEntry.nightEatingRememberYesOption}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="partial"
                  className="h-12 px-6 text-base"
                >
                  {t.dailyEntry.nightEatingRememberPartialOption}
                </ToggleGroupItem>
                <ToggleGroupItem value="no" className="h-12 px-6 text-base">
                  {t.dailyEntry.nightEatingRememberNoOption}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {state.showNightEatingReasonAsDisplay ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.nightEatingReasonLabel}
                </span>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    {state.nightEatingReason}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xl"
                    aria-label={t.dailyEntry.editNightEatingReasonLabel}
                    onClick={() => state.setIsEditingNightEatingReason(true)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.nightEatingReasonLabel}
                </span>
                <NoteEditRow
                  textareaProps={{
                    'aria-label': t.dailyEntry.nightEatingReasonLabel,
                    'aria-invalid': state.errors.nightEatingReason
                      ? true
                      : undefined,
                    placeholder:
                      t.dailyEntry.nightEatingReasonFieldPlaceholder,
                    ...state.register('nightEatingReason'),
                  }}
                  saveLabel={t.dailyEntry.saveNightEatingReasonLabel}
                  onSave={state.saveNightEatingReason}
                  saveDisabled={isBlankSaveValue(state.nightEatingReason)}
                  cancelLabel={t.dailyEntry.cancelEditNightEatingReasonLabel}
                  onCancel={state.cancelEditNightEatingReason}
                />
                {state.errors.nightEatingReason && (
                  <p className="text-sm text-destructive">
                    {state.errors.nightEatingReason.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {state.nightEatingOverride === false && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {t.dailyEntry.nightEatingNoEasyLabel}
              </span>
              <ToggleGroup
                type="single"
                aria-label={t.dailyEntry.nightEatingNoEasyLabel}
                value={
                  state.nightEatingNoEasy === undefined
                    ? ''
                    : state.nightEatingNoEasy
                      ? 'yes'
                      : 'no'
                }
                onValueChange={(value) =>
                  state.setNightEatingNoEasy(
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

            {state.showNightEatingNoWhatHelpedAsDisplay ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.nightEatingNoWhatHelpedLabel}
                </span>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    {state.nightEatingNoWhatHelped}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xl"
                    aria-label={t.dailyEntry.editNightEatingNoWhatHelpedLabel}
                    onClick={() =>
                      state.setIsEditingNightEatingNoWhatHelped(true)
                    }
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.nightEatingNoWhatHelpedLabel}
                </span>
                <NoteEditRow
                  textareaProps={{
                    'aria-label': t.dailyEntry.nightEatingNoWhatHelpedLabel,
                    'aria-invalid': state.errors.nightEatingNoWhatHelped
                      ? true
                      : undefined,
                    placeholder:
                      t.dailyEntry.nightEatingNoWhatHelpedFieldPlaceholder,
                    ...state.register('nightEatingNoWhatHelped'),
                  }}
                  saveLabel={t.dailyEntry.saveNightEatingNoWhatHelpedLabel}
                  onSave={state.saveNightEatingNoWhatHelped}
                  saveDisabled={isBlankSaveValue(
                    state.nightEatingNoWhatHelped,
                  )}
                  cancelLabel={
                    t.dailyEntry.cancelEditNightEatingNoWhatHelpedLabel
                  }
                  onCancel={state.cancelEditNightEatingNoWhatHelped}
                />
                {state.errors.nightEatingNoWhatHelped && (
                  <p className="text-sm text-destructive">
                    {state.errors.nightEatingNoWhatHelped.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
