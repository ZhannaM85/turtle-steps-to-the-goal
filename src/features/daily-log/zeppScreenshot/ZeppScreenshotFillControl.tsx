import { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'
import {
  formatExactNumber,
  useLocale,
  useTranslation,
  type Locale,
} from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { NumberInput } from '@/shared/ui/number-input'
import {
  hasZeppBodyCompositionValues,
  parseZeppBodyCompositionText,
  type ZeppBodyCompositionReading,
} from './parseZeppBodyCompositionText'
import { recognizeZeppScreenshot } from './recognizeZeppScreenshot'

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

export function ZeppScreenshotFillControl({
  asOfDate,
  onConfirm,
}: ZeppScreenshotFillControlProps) {
  const t = useTranslation()
  const locale = useLocale()
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
      const text = await recognizeZeppScreenshot(file)
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
                <NumberInput
                  label={t.dailyEntry.muscleMassLabel}
                  unit={t.dailyEntry.kgUnit}
                  value={muscleMassKg}
                  onChange={(e) => setMuscleMassKg(e.target.value)}
                />
                <NumberInput
                  label={t.dailyEntry.visceralFatLabel}
                  value={visceralFatRating}
                  onChange={(e) => setVisceralFatRating(e.target.value)}
                />
                <NumberInput
                  label={t.dailyEntry.bodyWaterLabel}
                  unit={t.dailyEntry.percentUnit}
                  value={bodyWaterPercent}
                  onChange={(e) => setBodyWaterPercent(e.target.value)}
                />
                <NumberInput
                  label={t.dailyEntry.boneMassLabel}
                  unit={t.dailyEntry.kgUnit}
                  value={boneMassKg}
                  onChange={(e) => setBoneMassKg(e.target.value)}
                />
                <NumberInput
                  label={t.dailyEntry.bodyFatLabel}
                  unit={t.dailyEntry.percentUnit}
                  value={bodyFatPercent}
                  onChange={(e) => setBodyFatPercent(e.target.value)}
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
