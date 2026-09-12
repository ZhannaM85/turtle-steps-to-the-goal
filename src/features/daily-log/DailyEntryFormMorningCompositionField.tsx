import { formatExactNumber } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  muscleMassKgSchema,
  visceralFatRatingSchema,
} from './dailyEntryFormSchema'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'
import { ZeppScreenshotFillControl } from './zeppScreenshot/ZeppScreenshotFillControl'

/** Body-composition field extracted from DailyEntryFormMorning (#864). */
export function DailyEntryFormMorningCompositionField() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  const comparison = state.entryComparisonBaselines
  // #515 — the collapsed Body composition row, in the same field order as
  // the edit grid. All five are peers (one smart-scale reading), so none is
  // singled out as a headline value.
  const bodyCompositionMetrics = [
    {
      field: 'muscleMassKg' as const,
      label: t.dailyEntry.muscleMassShortLabel,
      unit: 'kg' as const,
      value:
        state.muscleMassKg === undefined
          ? '—'
          : `${formatExactNumber(state.muscleMassKg, locale)}${t.dailyEntry.kgUnit}`,
      numericValue: state.muscleMassKg,
    },
    {
      field: 'visceralFatRating' as const,
      label: t.dailyEntry.visceralFatShortLabel,
      unit: 'none' as const,
      value:
        state.visceralFatRating === undefined
          ? '—'
          : formatExactNumber(state.visceralFatRating, locale),
      numericValue: state.visceralFatRating,
    },
    {
      field: 'bodyWaterPercent' as const,
      label: t.dailyEntry.bodyWaterShortLabel,
      unit: 'percent' as const,
      value:
        state.bodyWaterPercent === undefined
          ? '—'
          : `${formatExactNumber(state.bodyWaterPercent, locale)}${t.dailyEntry.percentUnit}`,
      numericValue: state.bodyWaterPercent,
    },
    {
      field: 'boneMassKg' as const,
      label: t.dailyEntry.boneMassShortLabel,
      unit: 'kg' as const,
      value:
        state.boneMassKg === undefined
          ? '—'
          : `${formatExactNumber(state.boneMassKg, locale)}${t.dailyEntry.kgUnit}`,
      numericValue: state.boneMassKg,
    },
    {
      field: 'bodyFatPercent' as const,
      label: t.dailyEntry.bodyFatShortLabel,
      unit: 'percent' as const,
      value:
        state.bodyFatPercent === undefined
          ? '—'
          : `${formatExactNumber(state.bodyFatPercent, locale)}${t.dailyEntry.percentUnit}`,
      numericValue: state.bodyFatPercent,
    },
  ]

  // #435 — validates on blur in addition to `saveBodyComposition()`'s
  // existing Save-time check, reusing the exact same schema. Composed with
  // `register()`'s own `onBlur` (needed for react-hook-form's internal
  // touched/dirty tracking) rather than replacing it.
  function bodyCompositionFieldProps(
    field: Parameters<typeof state.validateBodyCompositionFieldOnBlur>[0],
    schema: Parameters<typeof state.validateBodyCompositionFieldOnBlur>[1],
  ) {
    const registered = state.register(field, { setValueAs: parseNumberInput })
    return {
      ...registered,
      onBlur: (event: Parameters<typeof registered.onBlur>[0]) => {
        void registered.onBlur(event)
        state.validateBodyCompositionFieldOnBlur(field, schema)
      },
    }
  }

  return (
    <>
            {/* #233: muscle mass/visceral fat/body water/bone mass bundled
             * under one edit toggle, same shape as Body measurements above —
             * a distinct group since these come from a smart scale, not a
             * tape measure/caliper, but the same "occasional related numbers"
             * reasoning applies. #742: screenshot fill from Zepp Life in addition
             * to typing. */}
            {state.trackedFields.bodyComposition &&
              (state.isConfirmingDeleteBodyComposition ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyCompositionLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteBodyComposition}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteBodyComposition}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showBodyCompositionAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  {/* #750 / #858 — screenshot + pencil + trash on the
                   * title row so the five-value grid can use the full
                   * width underneath. */}
                  <DayFieldHeader
                    label={t.dailyEntry.bodyCompositionLabel}
                    actions={
                      <>
                        <ZeppScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applyBodyCompositionPatch}
                        />
                        <DayFieldViewActions
                          editLabel={t.dailyEntry.editBodyCompositionLabel}
                          onEdit={() =>
                            state.setIsEditingBodyComposition(true)
                          }
                          deleteLabel={t.dailyEntry.deleteBodyCompositionLabel}
                          onDelete={state.requestDeleteBodyComposition}
                          showDelete={state.canDeleteBodyComposition}
                        />
                      </>
                    }
                  />
                  {/* #515 — two-row grid, each metric the same visual weight. */}
                  <div className="rounded-lg bg-muted px-3 py-2.5">
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
                      {bodyCompositionMetrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="flex min-w-0 flex-col"
                        >
                          <dt className="flex min-w-0 items-center gap-0.5 truncate text-xs text-muted-foreground">
                            <span className="truncate">{metric.label}</span>
                            <EntryFieldComparisonInfo
                              field={metric.field}
                              currentValue={metric.numericValue}
                              prior={comparison.prior(metric.field)}
                              day30Value={comparison.day30Value(metric.field)}
                              unit={metric.unit}
                            />
                          </dt>
                          <dd className="text-sm font-medium tabular-nums text-foreground">
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyCompositionLabel}
                    actions={
                      <>
                        <ZeppScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applyBodyCompositionPatch}
                        />
                        <DayFieldEditActions
                          saveLabel={t.dailyEntry.saveBodyCompositionLabel}
                          onSave={state.saveBodyComposition}
                          cancelLabel={
                            t.dailyEntry.cancelEditBodyCompositionLabel
                          }
                          onCancel={state.cancelEditBodyComposition}
                          showCancel={state.canCancelBodyCompositionEdit}
                          deleteLabel={t.dailyEntry.deleteBodyCompositionLabel}
                          onDelete={state.requestDeleteBodyComposition}
                          showDelete={state.canDeleteBodyComposition}
                        />
                      </>
                    }
                  />
                  {/* #427 / #858 — 2-per-row grid of the five fields;
                   * ✓ / × / trash live on the title row so they no longer
                   * sit mid-grid. `w-fit` keeps columns sized to the
                   * narrow `w-16` inputs. #660 — `gap-y-4` keeps the gap
                   * between rows larger than each label's own `gap-1`. */}
                  <div className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-4">
                    <div className="col-start-1 row-start-1 flex flex-col gap-1">
                      {/* #446 — a fixed min-h reserves the same vertical space
                       * whether or not this particular label actually wraps, so
                       * every input in the row still starts at the same y
                       * position as its row siblings (a longer Russian label
                       * wrapping to 2 lines here used to push just *that*
                       * column's input down, misaligning it from the others in
                       * the same row). min-h-8 (32px) fits 2 lines at this
                       * text-xs size, the tallest any of these 5 labels wrap to.
                       * #660 — `flex items-end` bottom-aligns the label text
                       * within that reserved height, so a single-line label
                       * (most of these, in most locales) sits flush against
                       * its own input below instead of floating in the
                       * middle of the 32px box — which had been reading as
                       * roughly the same gap as the space to the *next*
                       * field's label. */}
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.muscleMassLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.muscleMassLabel} (${t.dailyEntry.kgUnit})`}
                          aria-invalid={
                            state.errors.muscleMassKg ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'muscleMassKg',
                            muscleMassKgSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.kgUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="muscleMassKg"
                        currentValue={state.muscleMassKg}
                        prior={comparison.prior('muscleMassKg')}
                        unit="kg"
                      />
                    </div>
                    <div className="col-start-2 row-start-1 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.visceralFatLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={t.dailyEntry.visceralFatLabel}
                          aria-invalid={
                            state.errors.visceralFatRating ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'visceralFatRating',
                            visceralFatRatingSchema,
                          )}
                        />
                      </div>
                      <EntryFieldComparisonLive
                        field="visceralFatRating"
                        currentValue={state.visceralFatRating}
                        prior={comparison.prior('visceralFatRating')}
                        unit="none"
                      />
                    </div>
                    <div className="col-start-1 row-start-2 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.bodyWaterLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.bodyWaterLabel} (${t.dailyEntry.percentUnit})`}
                          aria-invalid={
                            state.errors.bodyWaterPercent ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'bodyWaterPercent',
                            bodyWaterPercentSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.percentUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="bodyWaterPercent"
                        currentValue={state.bodyWaterPercent}
                        prior={comparison.prior('bodyWaterPercent')}
                        unit="percent"
                      />
                    </div>
                    <div className="col-start-2 row-start-2 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.boneMassLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.boneMassLabel} (${t.dailyEntry.kgUnit})`}
                          aria-invalid={
                            state.errors.boneMassKg ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'boneMassKg',
                            boneMassKgSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.kgUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="boneMassKg"
                        currentValue={state.boneMassKg}
                        prior={comparison.prior('boneMassKg')}
                        unit="kg"
                      />
                    </div>
                    <div className="col-start-1 row-start-3 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.bodyFatLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.bodyFatLabel} (${t.dailyEntry.percentUnit})`}
                          aria-invalid={
                            state.errors.bodyFatPercent ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'bodyFatPercent',
                            bodyFatPercentSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.percentUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="bodyFatPercent"
                        currentValue={state.bodyFatPercent}
                        prior={comparison.prior('bodyFatPercent')}
                        unit="percent"
                      />
                    </div>
                  </div>
                  {(state.errors.muscleMassKg ||
                    state.errors.visceralFatRating ||
                    state.errors.bodyWaterPercent ||
                    state.errors.boneMassKg ||
                    state.errors.bodyFatPercent) && (
                    <p className="text-sm text-destructive">
                      {state.errors.muscleMassKg?.message ??
                        state.errors.visceralFatRating?.message ??
                        state.errors.bodyWaterPercent?.message ??
                        state.errors.boneMassKg?.message ??
                        state.errors.bodyFatPercent?.message}
                    </p>
                  )}
                  {/* #401 — same soft-warning shape as weight's own above: a
                   * second Save tap on unchanged values commits anyway, Fix it
                   * just dismisses to keep editing. */}
                  {state.pendingUnusualBodyComposition !== null && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-destructive">
                        {t.dailyEntry.unusualBodyCompositionWarning}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={state.saveBodyComposition}
                        >
                          {t.dailyEntry.saveUnusualBodyCompositionAnywayLabel}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={state.discardUnusualBodyCompositionWarning}
                        >
                          {t.dailyEntry.fixBodyCompositionLabel}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
    </>
  )
}
