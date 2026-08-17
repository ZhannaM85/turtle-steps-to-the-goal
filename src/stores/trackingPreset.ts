// Imported from sibling files directly, not the `@/stores` barrel — this
// file is itself re-exported from that barrel (`stores/index.ts`), so
// importing it back would be a self-referential circular import.
import { useMicronutrientTrackingStore } from './micronutrientTrackingStore'
import { useSectionVisibilityStore, type SectionKey } from './sectionVisibilityStore'
import { useTodayCardOrderStore } from './todayCardOrderStore'
import { useTrackedFieldsStore, type TrackedField } from './trackedFieldsStore'
import { useWaterTrackingStore } from './waterTrackingStore'

export type TrackingPreset = 'simple' | 'full'

/**
 * #604 — a "Simple" Day layout for new/returning users, vs. "Full" (the
 * app's own shipped defaults). Deliberately does **not** touch cycle or
 * digestion tracking — those represent a real personal choice (does this
 * user menstruate / track digestion), not a UI-density preference, so
 * silently flipping either off on a "Simple" click would be a surprising
 * way to lose a deliberately-made setting. Custom metrics need no entry
 * here either — `CustomMetricLogSection.tsx` already renders nothing until
 * the user defines one, so there's nothing to hide for someone who hasn't.
 */
const SIMPLE_TRACKED_FIELDS: Record<TrackedField, boolean> = {
  sleep: false,
  steps: false,
  bodyMeasurements: false,
  note: false,
  mood: false,
  bodyComposition: false,
  nightEating: false,
  dayTotals: false,
  fiber: false,
  zeppScreenshot: true,
  autoSleepScreenshot: true,
}

/** The app's own out-of-the-box defaults (`trackedFieldsStore.ts`'s
 * `DEFAULT_TRACKED`) — kept as a literal copy rather than importing that
 * un-exported constant, since "Full" means "the documented shipped
 * layout," not "whatever the store's current default happens to be" if
 * that ever drifts independently of this preset. */
const FULL_TRACKED_FIELDS: Record<TrackedField, boolean> = {
  sleep: true,
  steps: true,
  bodyMeasurements: true,
  note: true,
  mood: true,
  bodyComposition: false,
  nightEating: true,
  dayTotals: true,
  fiber: true,
  zeppScreenshot: true,
  autoSleepScreenshot: true,
}

/** Today's own stat-card sections tied to the fields above — hidden
 * alongside turning the field itself off, so Simple doesn't leave an
 * empty/dashed card where a hidden field used to render. Goal-screen
 * sections (`goal*` keys) are untouched — this issue is scoped to Day. */
const SIMPLE_HIDDEN_SECTIONS: SectionKey[] = [
  'todayVsYesterday',
  'todayVsMaxWeight',
  'todayRemainingProtein',
  'todayRemainingFat',
  'todayRemainingCarbs',
  'todayRemainingFiber',
  'todayRemainingSodium',
  'todayRemainingPotassium',
  'todayRemainingMagnesium',
  'todayRemainingWater',
  'todaySteps',
  'todaySleep',
  'todayBmi',
]

/**
 * Applies a tracking preset (#604) across every store it touches: which
 * optional fields log at all (`trackedFieldsStore`), which Today stat
 * cards show (`sectionVisibilityStore`, Day-scoped keys only), whether
 * electrolytes are tracked (`micronutrientTrackingStore`), water tracking,
 * and the reorderable card order (reset to its own default either way —
 * a preset switch is a reasonable moment for "start from a known order,"
 * and Simple hiding several cards makes a previously-dragged order less
 * meaningful regardless).
 */
export function applyTrackingPreset(preset: TrackingPreset): void {
  const isSimple = preset === 'simple'

  useTrackedFieldsStore.setState({
    tracked: isSimple ? SIMPLE_TRACKED_FIELDS : FULL_TRACKED_FIELDS,
  })
  // Water's own store default is already off (opt-in, #258) — both presets
  // land there. "Optional water" in the issue's own Simple description
  // means it's an easy one-tap addition afterward, not that Simple turns
  // it on by default.
  useWaterTrackingStore.setState({ enabled: false })
  useMicronutrientTrackingStore.setState({
    tracked: { sodium: false, potassium: false, magnesium: false },
  })
  useSectionVisibilityStore.setState((state) => {
    const visible = { ...state.visible }
    for (const key of SIMPLE_HIDDEN_SECTIONS) {
      visible[key] = !isSimple
    }
    return { visible }
  })
  useTodayCardOrderStore.getState().resetOrder()
}
