import { useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { useTranslation } from '@/i18n'
import {
  isAppleHealthDayFieldSyncAvailable,
  requestAppleHealthFieldPermission,
  syncAppleHealthDayField,
  type AppleHealthDayReading,
  type AppleHealthSyncField,
} from '@/shared/native/appleHealth'
import { Button } from '@/shared/ui/button'

type SyncStatus = 'idle' | 'syncing' | 'denied' | 'noData' | 'error'

/**
 * #1105 — compact iOS-native control beside an empty Day weight/sleep/steps
 * field. Uses a Health-adjacent lucide icon (not a custom Apple logo).
 */
export function AppleHealthDayFieldSyncButton({
  field,
  date,
  empty,
  onApplied,
}: {
  field: AppleHealthSyncField
  date: string
  /** True when the diary field has no saved value. */
  empty: boolean
  onApplied: (reading: AppleHealthDayReading) => void
}) {
  const t = useTranslation()
  const [status, setStatus] = useState<SyncStatus>('idle')

  if (!empty || !isAppleHealthDayFieldSyncAvailable()) {
    return null
  }

  const ariaLabel =
    field === 'weight'
      ? t.dailyEntry.appleHealthSyncWeightLabel
      : field === 'sleep'
        ? t.dailyEntry.appleHealthSyncSleepLabel
        : t.dailyEntry.appleHealthSyncStepsLabel

  async function handleClick() {
    setStatus('syncing')
    try {
      const granted = await requestAppleHealthFieldPermission(field)
      if (!granted) {
        setStatus('denied')
        return
      }
      const reading = await syncAppleHealthDayField(date, field)
      if (!reading) {
        setStatus('noData')
        return
      }
      if (field === 'weight' && reading.weightKg === undefined) {
        setStatus('noData')
        return
      }
      if (
        field === 'sleep' &&
        reading.sleepHours === undefined &&
        reading.deepSleepHours === undefined
      ) {
        setStatus('noData')
        return
      }
      if (field === 'steps' && reading.steps === undefined) {
        setStatus('noData')
        return
      }
      onApplied(reading)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <span className="flex flex-col items-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-touch"
        aria-label={ariaLabel}
        disabled={status === 'syncing'}
        onClick={() => {
          void handleClick()
        }}
      >
        <HeartPulse aria-hidden="true" className="size-4" />
      </Button>
      {status === 'denied' && (
        <p className="max-w-[12rem] text-right text-xs text-destructive">
          {t.dailyEntry.appleHealthFieldSyncDeniedMessage}
        </p>
      )}
      {status === 'noData' && (
        <p className="max-w-[12rem] text-right text-xs text-muted-foreground">
          {t.dailyEntry.appleHealthFieldSyncNoDataMessage}
        </p>
      )}
      {status === 'error' && (
        <p className="max-w-[12rem] text-right text-xs text-destructive">
          {t.dailyEntry.appleHealthFieldSyncErrorMessage}
        </p>
      )}
    </span>
  )
}
