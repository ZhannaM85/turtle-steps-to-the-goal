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
  DayPinFrame,
  DayPinProvider,
  DaySectionPinButton,
} from './DaySectionPin'
import { useDaySectionPinStore } from '@/stores/daySectionPinStore'

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
    consumedProteinG: 128,
    consumedFatG: 71,
    consumedCarbG: 138,
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
    FakeIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    document.getElementById('main-content')?.remove()
  })

  it('shows the strip when the summary is off-screen and hides it when the cards are in view', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /1,680/ })).toBeNull()

    act(() => latestObserver().fire(false))
    const strip = screen.getByRole('button', { name: /1,680/ })
    expect(strip).toHaveAttribute('data-slot', 'day-kcal-strip')
    expect(strip).toHaveTextContent('1,680 · -275 kcal')
    expect(strip).toHaveTextContent('P 128g · F 71g · C 138g')
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

    const dock = document.querySelector('[data-slot="day-pin-dock"]')
    expect(dock?.querySelector('[data-day-section="macros"]')).toBeTruthy()
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
