import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { kgToLb } from '@/domain/goal'
import { formatExactNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { HealthConnect } from '@/shared/native/healthConnect'
import { Button } from '@/shared/ui/button'
import { useUnitStore } from '@/stores'
import { applyHealthConnectWeight } from './applyHealthConnectWeight'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

type SyncState =
  | { phase: 'checking' }
  | { phase: 'unavailable' | 'updateRequired' }
  | { phase: 'ready' | 'syncing' }
  | { phase: 'permissionDenied' | 'noData' | 'error' }
  | { phase: 'success'; weightText: string }

/**
 * #656 / #693 — Android-only (rendered from `SettingsScreen.tsx` behind a
 * `Capacitor.getPlatform() === 'android'` gate). A one-time "sync now"
 * action, not a background/ongoing toggle — matches this app's local-first,
 * user-in-control philosophy. #693: Sync uses overwrite so tapping again
 * refreshes today's weight from Health Connect after the source updates.
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
      const { granted } = await HealthConnect.requestWeightPermission()
      if (!granted) {
        setState({ phase: 'permissionDenied' })
        return
      }

      const { weightKg } = await HealthConnect.syncTodayWeight()
      if (weightKg === undefined) {
        setState({ phase: 'noData' })
        return
      }

      const date = format(new Date(), 'yyyy-MM-dd')
      const existing = await dailyEntryRepository.getByDate(date)
      const next = applyHealthConnectWeight(date, weightKg, existing)
      await dailyEntryRepository.upsert(next)

      const displayWeightKg = unit === 'lb' ? kgToLb(weightKg) : weightKg
      const weightText = `${formatExactNumber(displayWeightKg, locale)} ${unitLabel(unit, t)}`
      setState({ phase: 'success', weightText })
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
        <p className="text-sm text-foreground">
          {t.settings.healthConnectSyncSuccessMessage(state.weightText)}
        </p>
      )}
    </div>
  )
}
