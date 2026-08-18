import { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'
import { useTranslation } from '@/i18n'
import {
  combineHoursMinutes,
  splitHoursMinutes,
} from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useTrackedFieldsStore } from '@/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
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

function DurationFields({
  label,
  hours,
  minutes,
  hoursUnit,
  minutesUnit,
  hoursFieldLabel,
  minutesFieldLabel,
  onHoursChange,
  onMinutesChange,
}: {
  label: string
  hours: string
  minutes: string
  hoursUnit: string
  minutesUnit: string
  hoursFieldLabel: string
  minutesFieldLabel: string
  onHoursChange: (value: string) => void
  onMinutesChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${label} — ${hoursFieldLabel}`}
          className="h-12 w-12"
          value={hours}
          onChange={(e) => onHoursChange(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{hoursUnit}</span>
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${label} — ${minutesFieldLabel}`}
          className="h-12 w-12"
          value={minutes}
          onChange={(e) => onMinutesChange(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{minutesUnit}</span>
      </div>
    </div>
  )
}

export function AutoSleepScreenshotFillControl({
  asOfDate,
  onConfirm,
}: AutoSleepScreenshotFillControlProps) {
  const autoSleepScreenshotEnabled = useTrackedFieldsStore(
    (state) => state.tracked.autoSleepScreenshot,
  )
  const t = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [readingStatus, setReadingStatus] = useState<
    'idle' | 'reading' | 'ready' | 'empty' | 'failed'
  >('idle')
  const [sleepHoursPart, setSleepHoursPart] = useState('')
  const [sleepMinutesPart, setSleepMinutesPart] = useState('')
  const [deepSleepHoursPart, setDeepSleepHoursPart] = useState('')
  const [deepSleepMinutesPart, setDeepSleepMinutesPart] = useState('')
  const [screenshotDate, setScreenshotDate] = useState<string | undefined>()

  function resetFields() {
    setSleepHoursPart('')
    setSleepMinutesPart('')
    setDeepSleepHoursPart('')
    setDeepSleepMinutesPart('')
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
      const sleepParts = splitHoursMinutes(reading.sleepHours)
      const deepParts = splitHoursMinutes(reading.deepSleepHours)
      setSleepHoursPart(sleepParts.hours)
      setSleepMinutesPart(sleepParts.minutes)
      setDeepSleepHoursPart(deepParts.hours)
      setDeepSleepMinutesPart(deepParts.minutes)
      setScreenshotDate(reading.date)
      setReadingStatus('ready')
    } catch {
      setReadingStatus('failed')
    }
  }

  function readingFromFields(): AutoSleepReading {
    return {
      sleepHours: combineHoursMinutes(sleepHoursPart, sleepMinutesPart),
      deepSleepHours: combineHoursMinutes(
        deepSleepHoursPart,
        deepSleepMinutesPart,
      ),
    }
  }

  function handleConfirm() {
    const reading = readingFromFields()
    if (!hasAutoSleepValues(reading)) return
    onConfirm(reading)
    setOpen(false)
    setReadingStatus('idle')
    resetFields()
  }

  const canSave =
    readingStatus === 'ready' && hasAutoSleepValues(readingFromFields())

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
                <DurationFields
                  label={t.dailyEntry.sleepHoursLabel}
                  hours={sleepHoursPart}
                  minutes={sleepMinutesPart}
                  hoursUnit={t.dailyEntry.hoursUnit}
                  minutesUnit={t.dailyEntry.minutesUnit}
                  hoursFieldLabel={t.dailyEntry.hoursFieldLabel}
                  minutesFieldLabel={t.dailyEntry.minutesFieldLabel}
                  onHoursChange={setSleepHoursPart}
                  onMinutesChange={setSleepMinutesPart}
                />
                <DurationFields
                  label={t.dailyEntry.deepSleepLabel}
                  hours={deepSleepHoursPart}
                  minutes={deepSleepMinutesPart}
                  hoursUnit={t.dailyEntry.hoursUnit}
                  minutesUnit={t.dailyEntry.minutesUnit}
                  hoursFieldLabel={t.dailyEntry.hoursFieldLabel}
                  minutesFieldLabel={t.dailyEntry.minutesFieldLabel}
                  onHoursChange={setDeepSleepHoursPart}
                  onMinutesChange={setDeepSleepMinutesPart}
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
