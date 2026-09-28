import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatNumber, getDictionary } from '@/i18n'
import type { DailyEntryFormState } from './useDailyEntryFormState'
import { DailyEntryFormStateContext } from './dailyEntryFormStateContextValue'
import { DayKcalStrip } from './DayKcalStrip'
import { DayMacrosSection } from './DayMacrosSection'
import { MACROS_AUTO_COLLAPSE_HYSTERESIS_PX } from './macrosAutoCollapse'
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
    dailyCalorieTargetKcal: 1955,
    consumedProteinG: 128,
    dailyProteinTargetG: 150,
    consumedFatG: 71,
    dailyFatTargetG: 70,
    consumedCarbG: 138,
    dailyCarbTargetG: 200,
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
    expect(line).toHaveTextContent(
      '1,680/1,955 kcal · P 128/150 g · F 71/70 g · C 138/200 g',
    )
    expect(line).not.toHaveTextContent('-275')
    expect(line).toHaveClass('bg-muted', 'tabular-nums', 'px-3', 'py-2', 'whitespace-normal')
    expect(line).not.toHaveClass('h-8', 'overflow-hidden', 'truncate')
    expect(line?.parentElement).toHaveClass('mt-3', 'mb-1.5', 'w-full')
    expect(line?.parentElement).not.toHaveClass('mb-3')
    const titleButton = screen.getByRole('button', { name: /Show calories & macros/ })
    expect(titleButton.contains(line)).toBe(false)
    const pinButton = document.querySelector('[data-day-pin-button="macros"]')
    expect(pinButton?.parentElement?.contains(line)).toBe(false)
    expect(line?.parentElement?.parentElement?.contains(pinButton)).toBe(true)
    const pinSlot = document.querySelector('[data-day-pin-button="macros"]')?.parentElement
    expect(pinSlot).toHaveClass('flex', 'h-11', 'items-center')
    expect(pinSlot).not.toHaveClass('absolute')
    const section = line?.closest('[data-day-section="macros"]')
    expect(section).toBeTruthy()
    // #1039 — title row breathes from the card top. #1043 — half the
    // gap after this section; the stripe's own bottom margin is half.
    expect(section).toHaveClass('-mt-3', '-mb-3')
    expect(section?.firstElementChild).toHaveClass('pt-3')
    expect(section?.firstElementChild).not.toHaveClass('section-shell')
    expect(section).not.toHaveClass('-mx-4')
    expect(screen.queryByText('Consumed')).toBeNull()
    expect(screen.queryByText('Remaining')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Show calories & macros/ }))

    expect(summary()).toBeNull()
    expect(
      document.querySelector('[data-day-pin-button="macros"]')?.parentElement,
    ).toHaveClass('h-11', 'items-center')
    expect(screen.getByText('Consumed')).toBeVisible()
    expect(screen.getByText('Remaining')).toBeVisible()
    expect(screen.getByText('1,680')).toBeVisible()
    // #1043 — eaten/remaining stack is the pre-#1042 gap and card padding.
    const body = section?.querySelector('.gap-6.pt-3')
    expect(body).toHaveClass('gap-6', 'pt-3')
    expect(body).not.toHaveClass('gap-3')
    const remainingCard = screen.getByText('Remaining').closest('[data-slot="card"]')
    expect(remainingCard).not.toHaveClass('py-2!')
    expect(remainingCard?.querySelector('[data-slot="card-content"]')).toHaveClass(
      'gap-1',
    )
    expect(remainingCard?.querySelector('[data-slot="card-content"]')).not.toHaveClass(
      'gap-0.5',
    )
    const consumedCard = screen.getByText('Consumed').closest('[data-slot="card"]')
    expect(consumedCard?.querySelector('[data-slot="card-content"]')).toHaveClass(
      'gap-1',
    )
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
    expect(section?.firstElementChild).toHaveClass('pt-3')
    expect(section?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(section?.className ?? '').not.toMatch(/\bsticky\b/)
    expect(section).not.toHaveClass('-mx-4')
  })

  it('formats the collapsed line for the Russian locale', () => {
    const t = getDictionary('ru')
    render(<Harness locale="ru" />)
    const flat = summary()?.textContent?.replace(/\s/g, ' ')
    const kcal =
      `${formatNumber(1680, 'ru', 0)}/${formatNumber(1955, 'ru', 0)} ${t.dailyEntry.kcalUnit}`.replace(
        /\s/g,
        ' ',
      )
    expect(flat).toContain(`${kcal} · Б 128/150 г · Ж 71/70 г · У 138/200 г`)
    expect(flat).not.toContain(formatNumber(-275, 'ru', 0))
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
    expect(section).not.toHaveClass('-mx-4')
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
    // #1040 / #1041 — widened shell, not flexed back, with an opaque edge.
    expect(section).toHaveClass(
      '-mx-4',
      'px-4',
      'bg-background',
      'w-[calc(100%+2rem)]',
      'shrink-0',
      'border-b',
      'before:bg-background',
      '-mt-3',
      '-mb-3',
      'pb-1.5',
    )
    expect(section).not.toHaveClass('pb-3')
    expect(section?.firstElementChild).toHaveClass('pt-3')
    expect(summary()).toHaveClass('px-3', 'py-2')
    expect(summary()).toHaveTextContent('1,680/1,955 kcal')
    expect(document.querySelectorAll('[data-slot="day-macros-compact-summary"]')).toHaveLength(1)
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
  })

  it('collapses expanded КБЖУ after a downward scroll past the sticky chrome (#1036)', () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    const tops = { section: 160 }
    const chromeBottom = 80
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const box = (top: number, bottom: number): DOMRect =>
          ({
            x: 0,
            y: top,
            top,
            left: 0,
            right: 100,
            bottom,
            width: 100,
            height: bottom - top,
            toJSON() {
              return {}
            },
          }) as DOMRect
        if (this.getAttribute('data-slot') === 'day-intro') return box(0, chromeBottom)
        if (this.getAttribute('data-day-section') === 'macros') {
          return box(tops.section, tops.section + 420)
        }
        return box(0, 0)
      })
    const main = document.createElement('div')
    main.id = 'main-content'
    document.body.appendChild(main)
    let scrollTop = 0
    Object.defineProperty(main, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value
      },
    })

    try {
      render(<Harness />, { container: main })
      expect(screen.getByText('Consumed')).toBeInTheDocument()

      tops.section = chromeBottom - 8
      scrollTop = 30
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(false)
      expect(screen.getByText('Consumed')).toBeInTheDocument()

      tops.section = chromeBottom - MACROS_AUTO_COLLAPSE_HYSTERESIS_PX - 4
      scrollTop = 90
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)
      expect(summary()).toBeTruthy()
      expect(
        document.querySelector('[data-day-section="macros"]')?.getAttribute(
          'data-day-pin-sticky',
        ),
      ).toBe('true')
      expect(screen.queryByText('Consumed')).toBeNull()

      tops.section = chromeBottom
      scrollTop = 70
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)

      tops.section = chromeBottom + MACROS_AUTO_COLLAPSE_HYSTERESIS_PX - 1
      scrollTop = 40
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)
      expect(summary()).toBeTruthy()

      tops.section = chromeBottom + MACROS_AUTO_COLLAPSE_HYSTERESIS_PX
      scrollTop = 0
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(false)
      expect(summary()).toBeNull()
      expect(screen.getByText('Consumed')).toBeInTheDocument()
    } finally {
      cleanup()
      spy.mockRestore()
      main.remove()
    }
  })

  it('keeps a chevron collapse closed when the header scrolls back (#1038)', async () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    const user = userEvent.setup()
    const tops = { section: 200 }
    const chromeBottom = 80
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const box = (top: number, bottom: number): DOMRect =>
          ({
            x: 0,
            y: top,
            top,
            left: 0,
            right: 100,
            bottom,
            width: 100,
            height: bottom - top,
            toJSON() {
              return {}
            },
          }) as DOMRect
        if (this.getAttribute('data-slot') === 'day-intro') return box(0, chromeBottom)
        if (this.getAttribute('data-day-section') === 'macros') {
          return box(tops.section, tops.section + 80)
        }
        return box(0, 0)
      })
    const main = document.createElement('div')
    main.id = 'main-content'
    document.body.appendChild(main)
    let scrollTop = 0
    Object.defineProperty(main, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value
      },
    })

    try {
      render(<Harness />, { container: main })
      await user.click(screen.getByRole('button', { name: /Hide calories & macros/ }))
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)

      tops.section = chromeBottom + MACROS_AUTO_COLLAPSE_HYSTERESIS_PX + 24
      scrollTop = 48
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      scrollTop = 0
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)
      expect(summary()).toBeTruthy()
      expect(screen.queryByText('Consumed')).toBeNull()
    } finally {
      cleanup()
      spy.mockRestore()
      main.remove()
    }
  })
})
