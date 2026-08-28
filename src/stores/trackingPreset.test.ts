import { afterEach, describe, expect, it } from 'vitest'
import { applyTrackingPreset } from './trackingPreset'
import { useCycleTrackingStore } from './cycleTrackingStore'
import { useDigestionTrackingStore } from './digestionTrackingStore'
import { useMicronutrientTrackingStore } from './micronutrientTrackingStore'
import { useSectionVisibilityStore } from './sectionVisibilityStore'
import { useTodayCardOrderStore } from './todayCardOrderStore'
import { useTrackedFieldsStore } from './trackedFieldsStore'
import { useWaterTrackingStore } from './waterTrackingStore'

afterEach(() => {
  localStorage.clear()
})

describe('applyTrackingPreset (#604)', () => {
  it('simple turns off the advanced tracked fields and their Today cards', () => {
    applyTrackingPreset('simple')

    expect(useTrackedFieldsStore.getState().tracked).toEqual({
      sleep: false,
      steps: false,
      bodyMeasurements: false,
      note: false,
      morningNote: false,
      mood: false,
      bodyComposition: false,
      nightEating: false,
      dayTotals: false,
      fiber: false,
      zeppScreenshot: true,
      autoSleepScreenshot: true,
    })
    expect(useWaterTrackingStore.getState().enabled).toBe(false)
    expect(useMicronutrientTrackingStore.getState().tracked).toEqual({
      sodium: false,
      potassium: false,
      magnesium: false,
    })
    const visible = useSectionVisibilityStore.getState().visible
    expect(visible.todayVsYesterday).toBe(false)
    expect(visible.todaySleep).toBe(false)
    expect(visible.todayBmi).toBe(false)
  })

  it('simple leaves the core Today cards (weight target, calories) visible', () => {
    applyTrackingPreset('simple')

    const visible = useSectionVisibilityStore.getState().visible
    expect(visible.todayWeeklyTarget).toBe(true)
    expect(visible.todayRemainingCalories).toBe(true)
  })

  it('simple never touches Goal-screen sections (Day-scoped only)', () => {
    useSectionVisibilityStore.setState((state) => ({
      visible: { ...state.visible, goalReachedNudge: false },
    }))

    applyTrackingPreset('simple')

    expect(useSectionVisibilityStore.getState().visible.goalReachedNudge).toBe(
      false,
    )
  })

  it("full restores the app's own shipped defaults", () => {
    applyTrackingPreset('simple')

    applyTrackingPreset('full')

    expect(useTrackedFieldsStore.getState().tracked).toEqual({
      sleep: true,
      steps: true,
      bodyMeasurements: true,
      note: true,
      morningNote: false,
      mood: true,
      bodyComposition: false,
      nightEating: true,
      dayTotals: true,
      fiber: true,
      zeppScreenshot: true,
      autoSleepScreenshot: true,
    })
    const visible = useSectionVisibilityStore.getState().visible
    expect(visible.todayVsYesterday).toBe(true)
    expect(visible.todaySleep).toBe(true)
    expect(visible.todayBmi).toBe(true)
  })

  it('neither preset touches cycle or digestion tracking', () => {
    // A real personal-data opt-in, not a UI-density preference — flipping
    // it silently on a preset click would be a surprising way to lose a
    // deliberately-made choice.
    useCycleTrackingStore.setState({ enabled: true })
    useDigestionTrackingStore.setState({ enabled: true })

    applyTrackingPreset('simple')
    expect(useCycleTrackingStore.getState().enabled).toBe(true)
    expect(useDigestionTrackingStore.getState().enabled).toBe(true)

    applyTrackingPreset('full')
    expect(useCycleTrackingStore.getState().enabled).toBe(true)
    expect(useDigestionTrackingStore.getState().enabled).toBe(true)
  })

  it('resets the Today card order either way', () => {
    useTodayCardOrderStore.setState({
      order: ['remainingWater', 'remainingCalories'],
    })

    applyTrackingPreset('full')

    expect(useTodayCardOrderStore.getState().order[0]).toBe('remainingCalories')
  })
})
