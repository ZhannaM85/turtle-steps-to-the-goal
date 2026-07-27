import { useState } from 'react'
import type { CustomMetricInputKind } from '@/domain/customMetric'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

export interface AddMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    name: string,
    inputKind: CustomMetricInputKind,
    unit: string | undefined,
  ) => void
}

/**
 * Defines a new `CustomMetric` (#336) — name, how it's logged
 * (number/yes-no/1-5 scale), and an optional unit for the number kind.
 * `unit` is meaningless for `boolean`/`scale5` (a fixed Yes/No toggle or
 * 1-5 picker has no unit to speak of), so that field only shows for
 * `number`.
 */
export function AddMetricDialog({
  open,
  onOpenChange,
  onSave,
}: AddMetricDialogProps) {
  const t = useTranslation()
  const [name, setName] = useState('')
  const [inputKind, setInputKind] = useState<CustomMetricInputKind>('number')
  const [unit, setUnit] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(
      trimmed,
      inputKind,
      inputKind === 'number' ? unit.trim() || undefined : undefined,
    )
    setName('')
    setInputKind('number')
    setUnit('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.customMetrics.closeMetricDialogLabel}>
        <DialogTitle>{t.customMetrics.addMetricDialogTitle}</DialogTitle>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-metric-name">
              {t.customMetrics.metricNameLabel}
            </Label>
            <Input
              id="custom-metric-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.customMetrics.metricNamePlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.customMetrics.metricInputKindLabel}
            </span>
            <ToggleGroup
              type="single"
              value={inputKind}
              onValueChange={(value) =>
                value && setInputKind(value as CustomMetricInputKind)
              }
              className="w-full gap-2"
            >
              <ToggleGroupItem value="number" className="flex-1 text-sm">
                {t.customMetrics.metricInputKindNumberOption}
              </ToggleGroupItem>
              <ToggleGroupItem value="boolean" className="flex-1 text-sm">
                {t.customMetrics.metricInputKindBooleanOption}
              </ToggleGroupItem>
              <ToggleGroupItem value="scale5" className="flex-1 text-sm">
                {t.customMetrics.metricInputKindScaleOption}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {inputKind === 'number' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-metric-unit">
                {t.customMetrics.metricUnitLabel}
              </Label>
              <Input
                id="custom-metric-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t.customMetrics.metricUnitPlaceholder}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t.customMetrics.cancelLabel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!name.trim()}
              onClick={handleSave}
            >
              {t.customMetrics.saveButton}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
