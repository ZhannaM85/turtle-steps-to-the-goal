import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatNumber, getDictionary } from '@/i18n'
import type { DailyEntryFormState } from './useDailyEntryFormState'
import { DailyEntryFormStateContext } from './dailyEntryFormStateContextValue'
import { DayKcalStrip } from './DayKcalStrip'
import { DayMacrosSection } from './DayMacrosSection'
import {
  DayKcalStripSlot,
  DayPinDock,
  DayPinnedFlow,
  DayPinFrame,
  DayPinProvider,
} from './DaySectionPin'
import { useDaySectionPinStore } from '@/stores/daySectionPinStore'
import {
  DEFAULT_TODAY_SECTIONS,
  useTodaySectionsCollapseStore,
} from '@/stores/todaySectionsCollapseStore'

function formValue(locale: 'en' | 'ru' = 'en'): DailyEntryFormState {
  const t = getDictionary(locale)
  return {
    t,
    locale,
    dayTotalCalories: 1680,
    remainingKcal: -275,
    consumedProteinG: 128,
    consumedFatG: 71,
    consumedCarbG: 138,
    dayMacrosSummary: 'consumed',
    dayRemainingMacrosSummary: 'remaining',
    dayMacrosDescription: 'macros',
    dayRemainingMacrosDescription: 'left',
  } as DailyEntryFormState
}

function Harness({ locale = 'en' as 'en' | 'ru' }) {
  return (
    <DayPinProvider>
      <div data-slot="day-intro">
        <DayKcalStripSlot />
        <DayPinDock />
      </div>
      <div data-slot="day-sections">
        <DayPinnedFlow />
        <DayPinFrame id="nutritionFacts" stick={false}>
          <p>Notes</p>
        </DayPinFrame>
        <DailyEntryFormStateContext.Provider value={formValue(locale)}>
          <DayKcalStrip />
          <DayMacrosSection />
        </DailyEntryFormStateContext.Provider>
      </div>
    </DayPinProvider>
  )
}

function summary() {
  return document.querySelector('[data-slot="day-macros-compact-summary"]')
}

function precedes(earlier: Element | null, later: Element | null) {
  if (!earlier || !later) return false
  return (
    (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  )
}

describe('Day КБЖУ collapse (#1029)', () => {
  beforeEach(() => {
    localStorage.clear()
    useDaySectionPinStore.setState({ pinned: [] })
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: true },
    })
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      },
    )
  })

  it('shows the compact summary in the collapsed header and the full cards when expanded', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const line = summary()
    expect(line).toHaveTextContent('1,680 kcal')
    expect(line).toHaveTextContent('P 128g · F 71g · C 138g')
    expect(line).toHaveClass('bg-muted', 'tabular-nums', 'px-3', 'py-2')
    expect(line).not.toHaveClass('h-8')
    expect(line?.parentElement).toHaveClass('mt-6', 'mb-3')
    expect(
      document.querySelector('[data-day-pin-button="macros"]')?.parentElement,
    ).toHaveClass('absolute', 'top-0', 'right-0')
    expect(line?.closest('[data-day-section="macros"]')).toBeTruthy()
    expect(screen.queryByText('Consumed')).toBeNull()
    expect(screen.queryByText('Remaining')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Show calories & macros/ }))

    expect(summary()).toBeNull()
    expect(
      document.querySelector('[data-day-pin-button="macros"]')?.parentElement,
    ).not.toHaveClass('absolute')
    expect(screen.getByText('Consumed')).toBeVisible()
    expect(screen.getByText('Remaining')).toBeVisible()
    expect(screen.getByText('1,680')).toBeVisible()
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
    const section = document.querySelector('[data-day-section="macros"]')
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(section?.className ?? '').not.toMatch(/\bsticky\b/)
  })

  it('formats the collapsed line for the Russian locale', () => {
    const t = getDictionary('ru')
    render(<Harness locale="ru" />)
    const flat = summary()?.textContent?.replace(/\s/g, ' ')
    const kcal = `${formatNumber(1680, 'ru', 0)} ${t.dailyEntry.kcalUnit}`.replace(
      /\s/g,
      ' ',
    )
    expect(flat).toContain(kcal)
    expect(flat).not.toContain(formatNumber(-275, 'ru', 0))
    expect(flat).toContain('Б 128г · Ж 71г · У 138г')
  })

  it('does not stick an expanded section when it is pinned', () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    render(<Harness />)

    const section = document.querySelector('[data-day-section="macros"]')
    const notes = document.querySelector('[data-day-section="nutritionFacts"]')
    expect(section?.closest('[data-slot="day-pinned-flow"]')).toBeTruthy()
    expect(section?.closest('[data-slot="day-pin-dock"]')).toBeNull()
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(section?.getAttribute('data-day-pin-sticky')).toBe('false')
    expect(section?.className ?? '').not.toMatch(/\bsticky\b/)
    expect(precedes(section, notes)).toBe(true)
    expect(summary()).toBeNull()
    expect(screen.getByText('Consumed')).toBeVisible()
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
  })

  it('pins the collapsed row once and does not add the sticky strip beside it', () => {
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    render(<Harness />)

    const section = document.querySelector('[data-day-section="macros"]')
    expect(section?.closest('[data-slot="day-pinned-flow"]')).toBeTruthy()
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(section?.getAttribute('data-day-pin-sticky')).toBe('true')
    expect(section?.className ?? '').toMatch(/\bsticky\b/)
    expect(summary()).toHaveTextContent('1,680 kcal')
    expect(document.querySelectorAll('[data-slot="day-macros-compact-summary"]')).toHaveLength(1)
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
  })
})
