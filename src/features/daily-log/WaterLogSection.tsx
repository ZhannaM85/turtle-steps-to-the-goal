import { type FormEvent, useState } from 'react'
import { ChevronDown, CupSoda, GlassWater, X } from 'lucide-react'
import type { WaterEntry } from '@/domain/dailyEntry'
import { formatNumber } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'
import { NumberInput } from '@/shared/ui/number-input'
import { TimeInput } from '@/shared/ui/time-input'
import { useTodaySectionsCollapseStore } from '@/stores'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import { waterMlSchema } from './dailyEntryFormSchema'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

function formatWaterChipText(amountText: string, timeDrunk?: string): string {
  return timeDrunk ? `${amountText} · ${timeDrunk}` : amountText
}

function normalizeTimeHHMM(value: string): string | undefined {
  const hhmm = value.trim().slice(0, 5)
  if (!hhmm) return undefined
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm) ? hhmm : undefined
}

/**
 * #258/#271/#476/#598/#849 water quick-add + chips. #860: chip × asks
 * `ConfirmDeleteEntryBar` before removing (same as #855 Day fields).
 * Chip × is still remove — not the field-header cancel rule.
 */
export function WaterLogSection() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  const collapsed = useTodaySectionsCollapseStore((s) => s.sections.water)
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)
  const [editingWaterId, setEditingWaterId] = useState<string | null>(null)
  const [confirmingWaterId, setConfirmingWaterId] = useState<string | null>(
    null,
  )
  const [editAmount, setEditAmount] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editAmountError, setEditAmountError] = useState<string | undefined>()
  const editingWater = state.waterEntries.find(
    (entry) => entry.id === editingWaterId,
  )

  if (!state.waterTrackingEnabled) return null

  function openWaterEdit(entry: WaterEntry) {
    setConfirmingWaterId(null)
    setEditingWaterId(entry.id)
    setEditAmount(String(entry.amountMl))
    setEditTime(entry.timeDrunk ?? '')
    setEditAmountError(undefined)
  }

  function saveWaterEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingWater) return
    let amountMl = editingWater.amountMl
    if (editAmount.trim() !== '') {
      const parsed = waterMlSchema.safeParse(parseNumberInput(editAmount))
      if (!parsed.success || parsed.data === 0) {
        setEditAmountError(t.dailyEntry.invalidValueMessage)
        return
      }
      amountMl = parsed.data
    }
    state.updateWaterEntry(editingWater.id, {
      amountMl,
      timeDrunk: normalizeTimeHHMM(editTime),
    })
    setEditingWaterId(null)
  }

  return (
    <div id="water-entry-section" className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('water', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandWaterLabel
                : t.dailyEntry.collapseWaterLabel
            }
            className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t.dailyEntry.waterLabel}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1.5 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => state.addWaterEntry(250)}
              >
                {t.dailyEntry.addGlassLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => state.addWaterEntry(500)}
              >
                {t.dailyEntry.addBottleLabel}
              </Button>
            </div>
            {confirmingWaterId ? (
              <ConfirmDeleteEntryBar
                onConfirm={() => {
                  state.removeWaterEntry(confirmingWaterId)
                  setConfirmingWaterId(null)
                }}
                onCancel={() => setConfirmingWaterId(null)}
              />
            ) : (
              state.waterEntries.length > 0 && (
                // #488 — three chips per row was the volume-only layout.
                // #849 adds HH:MM on the same chip (`500мл · 10:15`), so
                // two columns keeps the time readable on a phone.
                <div className="grid grid-cols-2 gap-2">
                  {state.waterEntries.map((entry) => {
                    const amountText = `${formatNumber(entry.amountMl, locale, 0)}${t.dailyEntry.mlUnit}`
                    const chipText = formatWaterChipText(
                      amountText,
                      entry.timeDrunk,
                    )
                    // No literal "bottle" icon exists in lucide-react —
                    // CupSoda is the closest distinct large-container
                    // icon available, used for anything past a typical
                    // glass-sized add.
                    const Icon =
                      entry.amountMl > 300 ? CupSoda : GlassWater
                    return (
                      <span
                        key={entry.id}
                        className="flex min-w-0 items-center justify-center gap-1 rounded-full bg-muted py-1 pr-1 pl-2 text-sm"
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-center gap-1"
                          aria-label={t.dailyEntry.editWaterEntryLabel(
                            amountText,
                          )}
                          onClick={() => openWaterEdit(entry)}
                        >
                          <Icon
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{chipText}</span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t.dailyEntry.removeWaterEntryLabel(
                            amountText,
                          )}
                          onClick={() => setConfirmingWaterId(entry.id)}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </span>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Dialog
        open={editingWaterId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWaterId(null)
        }}
      >
        <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
          <DialogTitle>
            {t.dailyEntry.editWaterEntryDialogTitle}
          </DialogTitle>
          <form
            className="grid w-full min-w-0 grid-cols-1 gap-3 pt-3"
            onSubmit={saveWaterEdit}
          >
            <NumberInput
              id="water-entry-amount"
              label={t.dailyEntry.waterAmountLabel}
              unit={t.dailyEntry.mlUnit}
              value={editAmount}
              error={editAmountError}
              className="w-full min-w-0 max-w-full"
              onChange={(event) => {
                setEditAmount(event.target.value)
                setEditAmountError(undefined)
              }}
            />
            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <Label htmlFor="water-entry-time">
                {t.dailyEntry.timeEatenLabel}
              </Label>
              {/* #859 — shared TimeInput carries #856/#857 Safari width
               * + vertical-center; keep the same full-width box as Amount. */}
              <div className="relative w-full min-w-0">
                <TimeInput
                  id="water-entry-time"
                  aria-label={t.dailyEntry.timeEatenLabel}
                  value={editTime}
                  onChange={(event) => setEditTime(event.target.value)}
                  className="w-full min-w-0 max-w-full"
                />
              </div>
            </div>
            <Button type="submit" size="xl" className="w-full">
              {t.dailyEntry.saveButton}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
