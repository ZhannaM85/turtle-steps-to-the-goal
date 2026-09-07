import { Check, Moon, Pencil, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #818 — Night food as its own Day card (Yes/No + remember + reason),
 * not nested under Evening. Still gated by Settings night-eating tracking.
 * #825 — remember + reason only when Yes; hidden when No or unset.
 */
export function DailyEntryFormNightFood() {
  const state = useDailyEntryFormStateContext()
  const { t } = state

  if (!state.trackedFields.nightEating) return null

  return (
    <div className="section-shell p-3">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Moon aria-hidden="true" className="size-4" />
          {t.dailyEntry.nightFoodCardTitle}
        </span>
        <span className="text-xs text-muted-foreground">
          {t.dailyEntry.nightFoodCardHint(state.sex)}
        </span>
      </div>

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
                <div className="flex items-end gap-3">
                  <Textarea
                    aria-label={t.dailyEntry.nightEatingReasonLabel}
                    aria-invalid={
                      state.errors.nightEatingReason ? true : undefined
                    }
                    placeholder={t.dailyEntry.nightEatingReasonFieldPlaceholder}
                    className="flex-1"
                    {...state.register('nightEatingReason')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xl"
                    aria-label={t.dailyEntry.saveNightEatingReasonLabel}
                    onClick={state.saveNightEatingReason}
                  >
                    <Check aria-hidden="true" />
                  </Button>
                  {state.canCancelNightEatingReasonEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xl"
                      aria-label={t.dailyEntry.cancelEditNightEatingReasonLabel}
                      onClick={state.cancelEditNightEatingReason}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {state.errors.nightEatingReason && (
                  <p className="text-sm text-destructive">
                    {state.errors.nightEatingReason.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
