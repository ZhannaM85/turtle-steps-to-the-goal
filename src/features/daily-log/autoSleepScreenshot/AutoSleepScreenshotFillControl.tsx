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
import { useTrackedFieldsStore } from '@/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { NumberInput } from '@/shared/ui/number-input'
import {
  hasAutoSleepValues,
  parseAutoSleepText,
  type AutoSleepReading,
} from './parseAutoSleepText'
import { recognizeOnDeviceScreenshot } from '../recognizeOnDeviceScreenshot'

export interface AutoSleepScreenshotFillControlProps {
  asOfDate: string
  onConfirm: (reading: AutoSleepReading) => void
}

function fieldToInput(
  value: number | undefined,
  locale: Locale,
): string {
  return value === undefined ? '' : formatExactNumber(value, locale)
}

export function AutoSleepScreenshotFillControl({
  asOfDate,
  onConfirm,
}: AutoSleepScreenshotFillControlProps) {
  const autoSleepScreenshotEnabled = useTrackedFieldsStore(
    (state) => state.tracked.autoSleepScreenshot,
  )
  const t = useTranslation()
  const locale = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [readingStatus, setReadingStatus] = useState<
    'idle' | 'reading' | 'ready' | 'empty' | 'failed'
  >('idle')
  const [sleepHours, setSleepHours] = useState('')
  const [deepSleepHours, setDeepSleepHours] = useState('')
  const [screenshotDate, setScreenshotDate] = useState<string | undefined>()

  function resetFields() {
    setSleepHours('')
    setDeepSleepHours('')
    setScreenshotDate(undefined)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setOpen(true)
    setReadingStatus('reading')
    resetFields()
    try {
      const text = await recognizeOnDeviceScreenshot(file)
      const reading = parseAutoSleepText(text, asOfDate)
      if (!hasAutoSleepValues(reading)) {
        setReadingStatus('empty')
        return
      }
      setSleepHours(fieldToInput(reading.sleepHours, locale))
      setDeepSleepHours(fieldToInput(reading.deepSleepHours, locale))
      setScreenshotDate(reading.date)
      setReadingStatus('ready')
    } catch {
      setReadingStatus('failed')
    }
  }

  function handleConfirm() {
    const reading: AutoSleepReading = {
      sleepHours: parseNumberInput(sleepHours),
      deepSleepHours: parseNumberInput(deepSleepHours),
    }
    if (!hasAutoSleepValues(reading)) return
    onConfirm(reading)
    setOpen(false)
    setReadingStatus('idle')
    resetFields()
  }

  const canSave =
    readingStatus === 'ready' &&
    hasAutoSleepValues({
      sleepHours: parseNumberInput(sleepHours),
      deepSleepHours: parseNumberInput(deepSleepHours),
    })

  if (!autoSleepScreenshotEnabled) return null

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
        aria-label={t.dailyEntry.fillSleepFromScreenshotLabel}
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
        <DialogContent closeLabel={t.dailyEntry.autoSleepScreenshotCloseLabel}>
          <DialogTitle>{t.dailyEntry.autoSleepScreenshotDialogTitle}</DialogTitle>
          <DialogDescription>
            {t.dailyEntry.autoSleepScreenshotDialogDescription}
          </DialogDescription>
          <div className="flex flex-col gap-4 pt-4">
            {readingStatus === 'reading' && (
              <p className="text-sm text-muted-foreground">
                {t.dailyEntry.autoSleepScreenshotReadingLabel}
              </p>
            )}
            {readingStatus === 'failed' && (
              <p className="text-sm text-destructive">
                {t.dailyEntry.autoSleepScreenshotFailed}
              </p>
            )}
            {readingStatus === 'empty' && (
              <p className="text-sm text-destructive">
                {t.dailyEntry.autoSleepScreenshotNoValues}
              </p>
            )}
            {readingStatus === 'ready' && (
              <>
                {screenshotDate && screenshotDate !== asOfDate && (
                  <p className="text-sm text-muted-foreground">
                    {t.dailyEntry.autoSleepScreenshotDateHint(screenshotDate)}
                  </p>
                )}
                <NumberInput
                  label={t.dailyEntry.sleepHoursLabel}
                  unit={t.dailyEntry.hoursUnit}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                />
                <NumberInput
                  label={t.dailyEntry.deepSleepLabel}
                  unit={t.dailyEntry.hoursUnit}
                  value={deepSleepHours}
                  onChange={(e) => setDeepSleepHours(e.target.value)}
                />
                <Button
                  type="button"
                  size="xl"
                  className="w-full"
                  disabled={!canSave}
                  onClick={handleConfirm}
                >
                  {t.dailyEntry.autoSleepScreenshotSaveLabel}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
