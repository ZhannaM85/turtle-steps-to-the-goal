import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { kgToLb } from '@/domain/goal'
import { formatExactNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  getAppleHealthAvailability,
  requestAppleHealthPermissions,
  syncRecentAppleHealth,
} from '@/shared/native/appleHealth'
import { Button } from '@/shared/ui/button'
import { useCycleTrackingStore, useUnitStore } from '@/stores'
import {
  applyHealthConnectDayReadings,
  HEALTH_CONNECT_RECENT_DAYS,
} from './applyHealthConnectWeight'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

type SyncState =
  | { phase: 'checking' }
  | { phase: 'unavailable' }
  | { phase: 'ready' | 'syncing' }
  | { phase: 'permissionDenied' | 'noData' }
  | { phase: 'error'; detail?: string }
  | { phase: 'success'; summary: string }

/**
 * #1098 / #1099 — iOS-only Apple Health (HealthKit) Settings Sync. Same
 * overwrite / recent-window policy as Android Health Connect
 * (#656/#658/#694). Period → onPeriod when Cycle tracking is enabled.
 */
export function AppleHealthSyncSection() {
  const t = useTranslation()
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const [state, setState] = useState<SyncState>({ phase: 'checking' })

  useEffect(() => {
    let cancelled = false
    void getAppleHealthAvailability().then((status) => {
      if (cancelled) return
      setState(status === 'available' ? { phase: 'ready' } : { phase: 'unavailable' })
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSync() {
    setState({ phase: 'syncing' })
    try {
      const permission = await requestAppleHealthPermissions({
        includePeriod: cycleTrackingEnabled,
      })
      if (!permission.granted) {
        setState({ phase: 'permissionDenied' })
        return
      }

      const readings = await syncRecentAppleHealth({
        days: HEALTH_CONNECT_RECENT_DAYS,
        includePeriod: cycleTrackingEnabled,
      })
      if (readings.length === 0) {
        setState({ phase: 'noData' })
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const rangeStart = format(
        subDays(new Date(), HEALTH_CONNECT_RECENT_DAYS - 1),
        'yyyy-MM-dd',
      )
      const existing = await dailyEntryRepository.getRange(rangeStart, today)
      const toUpsert = applyHealthConnectDayReadings(readings, existing)
      await Promise.all(toUpsert.map((entry) => dailyEntryRepository.upsert(entry)))

      const todayReading = readings.find((w) => w.date === today)
      const dayCount = readings.length
      const todayText =
        todayReading?.weightKg === undefined
          ? undefined
          : (() => {
              const displayKg =
                unit === 'lb' ? kgToLb(todayReading.weightKg) : todayReading.weightKg
              return `${formatExactNumber(displayKg, locale)} ${unitLabel(unit, t)}`
            })()
      setState({
        phase: 'success',
        summary: t.settings.appleHealthSyncSuccessMessage(dayCount, todayText),
      })
    } catch (err) {
      const detail =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : undefined
      setState({ phase: 'error', detail })
    }
  }

  if (state.phase === 'checking') {
    return null
  }

  if (state.phase === 'unavailable') {
    return (
      <p className="text-sm text-muted-foreground">
        {t.settings.appleHealthUnavailableMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {cycleTrackingEnabled
          ? t.settings.appleHealthSyncDescriptionWithPeriod
          : t.settings.appleHealthSyncDescription}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={state.phase === 'syncing'}
        onClick={handleSync}
      >
        {state.phase === 'syncing'
          ? t.settings.appleHealthSyncingButton
          : t.settings.appleHealthSyncButton}
      </Button>
      {state.phase === 'permissionDenied' && (
        <p className="text-sm text-destructive">
          {t.settings.appleHealthPermissionDeniedMessage}
        </p>
      )}
      {state.phase === 'noData' && (
        <p className="text-sm text-muted-foreground">
          {t.settings.appleHealthSyncNoDataMessage}
        </p>
      )}
      {state.phase === 'error' && (
        <p className="text-sm text-destructive">
          {t.settings.appleHealthSyncErrorMessage}
          {state.detail ? ` (${state.detail})` : null}
        </p>
      )}
      {state.phase === 'success' && (
        <p className="text-sm text-foreground">{state.summary}</p>
      )}
    </div>
  )
}
