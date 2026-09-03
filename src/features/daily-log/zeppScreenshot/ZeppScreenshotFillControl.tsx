import { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'
import type { ComparableEntryField, FieldBaseline } from '@/domain/dailyEntry'
import {
  formatExactNumber,
  useLocale,
  useTranslation,
  type Locale,
} from '@/i18n'
import { useEntryFieldComparisonBaselines } from '@/shared/hooks'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { useTrackedFieldsStore } from '@/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { NumberInput } from '@/shared/ui/number-input'
import {
  EntryFieldComparisonLive,
  type EntryComparisonUnit,
} from '../EntryFieldComparison'
import {
  hasZeppBodyCompositionValues,
  parseZeppBodyCompositionText,
  type ZeppBodyCompositionReading,
} from './parseZeppBodyCompositionText'
import { recognizeZeppScreenshot } from './recognizeZeppScreenshot'
import { prepareZeppScreenshotForOcr } from '../prepareScreenshotForOcr'

export interface ZeppScreenshotFillControlProps {
  asOfDate: string
  onConfirm: (reading: ZeppBodyCompositionReading) => void
}

function fieldToInput(
  value: number | undefined,
  locale: Locale,
): string {
  return value === undefined ? '' : formatExactNumber(value, locale)
}

function ConfirmField({
  label,
  unit,
  value,
  onChange,
  field,
  prior,
  comparisonUnit,
}: {
  label: string
  unit?: string
  value: string
  onChange: (next: string) => void
  field: ComparableEntryField
  prior: FieldBaseline | null
  comparisonUnit: EntryComparisonUnit
}) {
  return (
    <div className="flex flex-col gap-1">
      <NumberInput
        label={label}
        unit={unit}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <EntryFieldComparisonLive
        field={field}
        currentValue={parseNumberInput(value)}
        prior={prior}
        unit={comparisonUnit}
      />
    </div>
  )
}

export function ZeppScreenshotFillControl({
  asOfDate,
  onConfirm,
}: ZeppScreenshotFillControlProps) {
  const zeppScreenshotEnabled = useTrackedFieldsStore(
    (state) => state.tracked.zeppScreenshot,
  )
  const t = useTranslation()
  const locale = useLocale()
  const comparison = useEntryFieldComparisonBaselines(asOfDate)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [readingStatus, setReadingStatus] = useState<
    'idle' | 'reading' | 'ready' | 'empty' | 'failed'
  >('idle')
  const [muscleMassKg, setMuscleMassKg] = useState('')
  const [visceralFatRating, setVisceralFatRating] = useState('')
  const [bodyWaterPercent, setBodyWaterPercent] = useState('')
  const [boneMassKg, setBoneMassKg] = useState('')
  const [bodyFatPercent, setBodyFatPercent] = useState('')
  const [screenshotDate, setScreenshotDate] = useState<string | undefined>()

  function resetFields() {
    setMuscleMassKg('')
    setVisceralFatRating('')
    setBodyWaterPercent('')
    setBoneMassKg('')
    setBodyFatPercent('')
    setScreenshotDate(undefined)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setOpen(true)
    setReadingStatus('reading')
    resetFields()
    try {
      const prepared = await prepareZeppScreenshotForOcr(file)
      const text = await recognizeZeppScreenshot(prepared)
      const reading = parseZeppBodyCompositionText(text, asOfDate)
      if (!hasZeppBodyCompositionValues(reading)) {
        setReadingStatus('empty')
        return
      }
      setMuscleMassKg(fieldToInput(reading.muscleMassKg, locale))
      setVisceralFatRating(fieldToInput(reading.visceralFatRating, locale))
      setBodyWaterPercent(fieldToInput(reading.bodyWaterPercent, locale))
      setBoneMassKg(fieldToInput(reading.boneMassKg, locale))
      setBodyFatPercent(fieldToInput(reading.bodyFatPercent, locale))
      setScreenshotDate(reading.date)
      setReadingStatus('ready')
    } catch {
      setReadingStatus('failed')
    }
  }

  function handleConfirm() {
    const reading: ZeppBodyCompositionReading = {
      muscleMassKg: parseNumberInput(muscleMassKg),
      visceralFatRating: parseNumberInput(visceralFatRating),
      bodyWaterPercent: parseNumberInput(bodyWaterPercent),
      boneMassKg: parseNumberInput(boneMassKg),
      bodyFatPercent: parseNumberInput(bodyFatPercent),
    }
    if (!hasZeppBodyCompositionValues(reading)) return
    onConfirm(reading)
    setOpen(false)
    setReadingStatus('idle')
    resetFields()
  }

  const canSave =
    readingStatus === 'ready' &&
    hasZeppBodyCompositionValues({
      muscleMassKg: parseNumberInput(muscleMassKg),
      visceralFatRating: parseNumberInput(visceralFatRating),
      bodyWaterPercent: parseNumberInput(bodyWaterPercent),
      boneMassKg: parseNumberInput(boneMassKg),
      bodyFatPercent: parseNumberInput(bodyFatPercent),
    })

  if (!zeppScreenshotEnabled) return null

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void handleFile(file)
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xl"
        aria-label={t.dailyEntry.fillBodyCompositionFromScreenshotLabel}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageUp aria-hidden="true" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setReadingStatus('idle')
            resetFields()
          }
        }}
      >
        <DialogContent closeLabel={t.dailyEntry.zeppScreenshotCloseLabel}>
          <DialogTitle>{t.dailyEntry.zeppScreenshotDialogTitle}</DialogTitle>
          <DialogDescription>
            {t.dailyEntry.zeppScreenshotDialogDescription}
          </DialogDescription>
          <div className="flex flex-col gap-4 pt-4">
            {readingStatus === 'reading' && (
              <p className="text-sm text-muted-foreground">
                {t.dailyEntry.zeppScreenshotReadingLabel}
              </p>
            )}
            {readingStatus === 'failed' && (
              <p className="text-sm text-destructive">
                {t.dailyEntry.zeppScreenshotFailed}
              </p>
            )}
            {readingStatus === 'empty' && (
              <p className="text-sm text-destructive">
                {t.dailyEntry.zeppScreenshotNoValues}
              </p>
            )}
            {readingStatus === 'ready' && (
              <>
                {screenshotDate && screenshotDate !== asOfDate && (
                  <p className="text-sm text-muted-foreground">
                    {t.dailyEntry.zeppScreenshotDateHint(screenshotDate)}
                  </p>
                )}
                <ConfirmField
                  label={t.dailyEntry.muscleMassLabel}
                  unit={t.dailyEntry.kgUnit}
                  value={muscleMassKg}
                  onChange={setMuscleMassKg}
                  field="muscleMassKg"
                  prior={comparison.prior('muscleMassKg')}
                  comparisonUnit="kg"
                />
                <ConfirmField
                  label={t.dailyEntry.visceralFatLabel}
                  value={visceralFatRating}
                  onChange={setVisceralFatRating}
                  field="visceralFatRating"
                  prior={comparison.prior('visceralFatRating')}
                  comparisonUnit="none"
                />
                <ConfirmField
                  label={t.dailyEntry.bodyWaterLabel}
                  unit={t.dailyEntry.percentUnit}
                  value={bodyWaterPercent}
                  onChange={setBodyWaterPercent}
                  field="bodyWaterPercent"
                  prior={comparison.prior('bodyWaterPercent')}
                  comparisonUnit="percent"
                />
                <ConfirmField
                  label={t.dailyEntry.boneMassLabel}
                  unit={t.dailyEntry.kgUnit}
                  value={boneMassKg}
                  onChange={setBoneMassKg}
                  field="boneMassKg"
                  prior={comparison.prior('boneMassKg')}
                  comparisonUnit="kg"
                />
                <ConfirmField
                  label={t.dailyEntry.bodyFatLabel}
                  unit={t.dailyEntry.percentUnit}
                  value={bodyFatPercent}
                  onChange={setBodyFatPercent}
                  field="bodyFatPercent"
                  prior={comparison.prior('bodyFatPercent')}
                  comparisonUnit="percent"
                />
                <Button
                  type="button"
                  size="xl"
                  className="w-full"
                  disabled={!canSave}
                  onClick={handleConfirm}
                >
                  {t.dailyEntry.zeppScreenshotSaveLabel}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
