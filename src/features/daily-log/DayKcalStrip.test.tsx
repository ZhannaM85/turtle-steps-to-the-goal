import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import type { DailyEntryFormState } from './useDailyEntryFormState'
import { DailyEntryFormStateContext } from './dailyEntryFormStateContextValue'
import { DayKcalStrip } from './DayKcalStrip'
import {
  DayKcalStripSlot,
  DayPinDock,
  DayPinnedFlow,
  DayPinFrame,
  DayPinProvider,
  DaySectionPinButton,
} from './DaySectionPin'
import { useDaySectionPinStore } from '@/stores/daySectionPinStore'
import {
  DEFAULT_TODAY_SECTIONS,
  useTodaySectionsCollapseStore,
} from '@/stores/todaySectionsCollapseStore'

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  cb: IntersectionObserverCallback
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
    FakeIntersectionObserver.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  fire(isIntersecting: boolean) {
    const target = document.querySelector('[data-day-section="macros"]')
    this.cb(
      [{ isIntersecting, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

function formValue(): DailyEntryFormState {
  return {
    dayTotalCalories: 1680,
    remainingKcal: -275,
    dailyCalorieTargetKcal: 1955,
    consumedProteinG: 128,
    dailyProteinTargetG: 150,
    consumedFatG: 71,
    dailyFatTargetG: 70,
    consumedCarbG: 138,
    dailyCarbTargetG: 200,
    dayMacrosSummary: 'consumed',
    dayRemainingMacrosSummary: 'remaining',
  } as DailyEntryFormState
}

function Harness() {
  return (
    <DayPinProvider>
      <div id="main-content" data-slot="day-intro">
        <div data-slot="day-intro-chrome">Date</div>
        <DayKcalStripSlot />
        <DayPinDock />
      </div>
      <DayPinnedFlow />
      <DailyEntryFormStateContext.Provider value={formValue()}>
        <DayKcalStrip />
        <DayPinFrame id="macros">
          <div>
            <DaySectionPinButton id="macros" />
            <p>Full KBJU cards</p>
          </div>
        </DayPinFrame>
      </DailyEntryFormStateContext.Provider>
    </DayPinProvider>
  )
}

function latestObserver() {
  const observer = FakeIntersectionObserver.instances.at(-1)
  if (!observer) throw new Error('expected an intersection observer')
  return observer
}

describe('Day kcal strip and pins (#1022)', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
    useDaySectionPinStore.setState({ pinned: [] })
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: true },
    })
    FakeIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    document.getElementById('main-content')?.remove()
  })

  it('does not stick the strip while calories and macros are expanded (#1029)', () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    render(<Harness />)
    act(() => latestObserver().fire(false))
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
    const section = document.querySelector('[data-day-section="macros"]')
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    // This harness does not pass macros `stick`; DayMacrosSection (#1049)
    // keeps a pinned expanded row sticky in the real Day screen.
    expect(section?.className ?? '').not.toMatch(/\bsticky\b/)
  })

  it('shows the strip when the collapsed summary is off-screen and hides it when the row is in view', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()

    act(() => latestObserver().fire(false))
    const strip = screen.getByRole('button', { name: /1,680/ })
    expect(strip).toHaveAttribute('data-slot', 'day-kcal-strip')
    expect(strip).toHaveTextContent(
      '1,680/1,955 kcal · P 128/150 g · F 71/70 g · C 138/200 g',
    )
    expect(strip).not.toHaveTextContent('-275')
    expect(strip.closest('[data-slot="day-intro"]')).toBeTruthy()

    act(() => latestObserver().fire(true))
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()
    expect(screen.getByText('Full KBJU cards')).toBeInTheDocument()
  })

  it('does not show the strip together with a pinned summary that stays in view', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    act(() => latestObserver().fire(false))
    expect(screen.getByRole('button', { name: /1,680/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pin to top' }))

    const section = document.querySelector('[data-day-section="macros"]')
    expect(section?.closest('[data-slot="day-pinned-flow"]')).toBeTruthy()
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(section?.getAttribute('data-day-pin-sticky')).toBe('true')
    expect(screen.getByText('Full KBJU cards')).toBeInTheDocument()

    act(() => latestObserver().fire(true))
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()
  })

  it('brings the strip back if a pinned summary scrolls out of view', () => {
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()

    act(() => latestObserver().fire(false))
    expect(screen.getByRole('button', { name: /1,680/ })).toBeInTheDocument()
  })

  it('leaves history unmarked when the pin provider is absent', () => {
    render(
      <DayPinFrame id="meals">
        <p>Meals</p>
      </DayPinFrame>,
    )
    expect(screen.getByText('Meals')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pin to top' })).toBeNull()
    expect(document.querySelector('[data-day-section]')).toBeNull()
  })
})
