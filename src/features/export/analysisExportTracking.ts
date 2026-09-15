import type { AnalysisExportTrackingGate } from './dailyLogExport'
import { useAlcoholTrackingStore } from '@/stores/alcoholTrackingStore'
import { useCycleTrackingStore } from '@/stores/cycleTrackingStore'
import { useDigestionTrackingStore } from '@/stores/digestionTrackingStore'
import { useEatingReasonTrackingStore } from '@/stores/eatingReasonTrackingStore'
import { useMicronutrientTrackingStore } from '@/stores/micronutrientTrackingStore'
import { useTrackedFieldsStore } from '@/stores/trackedFieldsStore'
import { useWaterTrackingStore } from '@/stores/waterTrackingStore'

/**
 * #744 / #898 — current Settings → What to track gates for analysis exports
 * (CSV / Excel / Markdown / Day-share CSV). JSON backup does not use this.
 */
export function currentAnalysisExportTracking(): AnalysisExportTrackingGate {
  const trackedFields = useTrackedFieldsStore.getState().tracked
  const micronutrients = useMicronutrientTrackingStore.getState().tracked
  return {
    sleep: trackedFields.sleep,
    steps: trackedFields.steps,
    bodyMeasurements: trackedFields.bodyMeasurements,
    note: trackedFields.note,
    morningNote: trackedFields.morningNote,
    mood: trackedFields.mood,
    bodyComposition: trackedFields.bodyComposition,
    nightEating: trackedFields.nightEating,
    fiber: trackedFields.fiber,
    cycle: useCycleTrackingStore.getState().enabled,
    digestion: useDigestionTrackingStore.getState().enabled,
    alcohol: useAlcoholTrackingStore.getState().enabled,
    water: useWaterTrackingStore.getState().enabled,
    sodium: micronutrients.sodium,
    potassium: micronutrients.potassium,
    magnesium: micronutrients.magnesium,
    eatingReason: useEatingReasonTrackingStore.getState().enabled,
  }
}
