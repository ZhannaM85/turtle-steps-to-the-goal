import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { kgToLb } from '@/domain/goal'
import { formatExactNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { HealthConnect } from '@/shared/native/healthConnect'
import { Button } from '@/shared/ui/button'
import { useUnitStore } from '@/stores'
import {
  applyHealthConnectDayReadings,
  HEALTH_CONNECT_RECENT_DAYS,
  mergeHealthConnectNativeReadings,
} from './applyHealthConnectWeight'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

type SyncState =
  | { phase: 'checking' }
  | { phase: 'unavailable' | 'updateRequired' }
  | { phase: 'ready' | 'syncing' }
  | { phase: 'permissionDenied' | 'noData' | 'error' }
  | { phase: 'success'; summary: string }

/**
 * #656 / #693 / #694 / #657 — Android-only (rendered from `SettingsScreen.tsx`
 * behind a `Capacitor.getPlatform() === 'android'` gate). On-demand Sync
 * pulls recent Health Connect weight + steps (default 7 days) and overwrites
 * local values.
 */
export function HealthConnectSyncSection() {
  const t = useTranslation()
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const [state, setState] = useState<SyncState>({ phase: 'checking' })

  useEffect(() => {
    let cancelled = false
    void HealthConnect.getAvailability().then(({ status }) => {
      if (cancelled) return
      setState(status === 'available' ? { phase: 'ready' } : { phase: status })
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleInstall() {
    await HealthConnect.openHealthConnectInstall()
  }

  async function handleSync() {
    setState({ phase: 'syncing' })
    try {
      const permission = await HealthConnect.requestWeightPermission()
      if (!permission.granted) {
        setState({ phase: 'permissionDenied' })
        return
      }

      const weightGranted = permission.weightGranted !== false
      const stepsGranted = permission.stepsGranted !== false

      const [weightResult, stepsResult] = await Promise.all([
        weightGranted
          ? HealthConnect.syncRecentWeights({ days: HEALTH_CONNECT_RECENT_DAYS })
          : Promise.resolve({ weights: [] }),
        stepsGranted
          ? HealthConnect.syncRecentSteps({ days: HEALTH_CONNECT_RECENT_DAYS })
          : Promise.resolve({ steps: [] }),
      ])

      const readings = mergeHealthConnectNativeReadings(
        weightResult.weights,
        stepsResult.steps,
      )
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
        summary: t.settings.healthConnectSyncSuccessMessage(dayCount, todayText),
      })
    } catch {
      setState({ phase: 'error' })
    }
  }

  if (state.phase === 'checking') {
    return null
  }

  if (state.phase === 'unavailable' || state.phase === 'updateRequired') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t.settings.healthConnectUnavailableMessage}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={handleInstall}
        >
          {t.settings.healthConnectInstallButton}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t.settings.healthConnectSyncDescription}
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
          ? t.settings.healthConnectSyncingButton
          : t.settings.healthConnectSyncButton}
      </Button>
      {state.phase === 'permissionDenied' && (
        <p className="text-sm text-destructive">
          {t.settings.healthConnectPermissionDeniedMessage}
        </p>
      )}
      {state.phase === 'noData' && (
        <p className="text-sm text-muted-foreground">
          {t.settings.healthConnectSyncNoDataMessage}
        </p>
      )}
      {state.phase === 'error' && (
        <p className="text-sm text-destructive">
          {t.settings.healthConnectSyncErrorMessage}
        </p>
      )}
      {state.phase === 'success' && (
        <p className="text-sm text-foreground">{state.summary}</p>
      )}
    </div>
  )
}
