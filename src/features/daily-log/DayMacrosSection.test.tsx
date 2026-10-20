import { act, cleanup, render, screen } from '@testing-library/react'
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
    expect(line?.parentElement).toHaveClass('mb-1.5', 'w-full')
    expect(line?.parentElement).not.toHaveClass('mt-3')
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
    // #1046 — no #1039 card top padding while collapsed. #1043 — half
    // the gap after this section; the stripe's own bottom margin is half.
    expect(section).toHaveClass('-mt-3', '-mb-3')
    expect(section?.firstElementChild).not.toHaveClass('pt-3')
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
    // #1050 — no extra pad under the title, and the same full-width row
    // as the collapsed stripe (no side inset of its own).
    const body = section?.querySelector('.gap-6')
    expect(body).toHaveClass('flex', 'w-full', 'min-w-0', 'gap-6')
    expect(body).not.toHaveClass('pt-3', 'gap-3')
    expect(body?.className ?? '').not.toMatch(/\b(px-|mx-|pl-|pr-)/)
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
    // #1050 — title row stays put. #1046's collapsed rule and the open
    // body share "no card pt-3".
    expect(section?.firstElementChild).not.toHaveClass('pt-3')
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

  it('keeps a pinned expanded КБЖУ sticky so cards overlay content (#1049)', () => {
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
    expect(section?.getAttribute('data-day-pin-sticky')).toBe('true')
    expect(section?.className ?? '').toMatch(/\bsticky\b/)
    expect(section).toHaveClass('-mx-4', 'shadow-md', 'z-[9]', 'px-4')
    // #1050 — sticky-open cards use the section's px-4 only, the same
    // content width as the collapsed stripe. No second side inset.
    const body = section?.querySelector('.gap-6')
    expect(body).toHaveClass('w-full', 'min-w-0', 'gap-6')
    expect(body).not.toHaveClass('pt-3')
    expect(body?.className ?? '').not.toMatch(/\b(px-|mx-|pl-|pr-)/)
    expect(section?.firstElementChild).not.toHaveClass('pt-3')
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
    expect(section?.firstElementChild).not.toHaveClass('pt-3')
    expect(summary()).toHaveClass('px-3', 'py-2')
    expect(summary()).toHaveTextContent('1,680/1,955 kcal')
    expect(document.querySelectorAll('[data-slot="day-macros-compact-summary"]')).toHaveLength(1)
    expect(document.querySelector('[data-slot="day-kcal-strip"]')).toBeNull()
  })

  it('does not collapse expanded КБЖУ on scroll alone (#1109)', () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: [] })
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
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(false)

      scrollTop = 240
      act(() => {
        main.dispatchEvent(new Event('scroll'))
      })
      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(false)
      expect(screen.getByText('Consumed')).toBeInTheDocument()
      expect(summary()).toBeNull()
      expect(
        document.querySelector('[data-day-section="macros"]')?.getAttribute(
          'data-day-pin-sticky',
        ),
      ).toBe('false')
    } finally {
      cleanup()
      main.remove()
    }
  })

  it('collapses КБЖУ when the user pins it (#1109)', async () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: [] })
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText('Consumed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pin to top' }))

    expect(useDaySectionPinStore.getState().pinned).toContain('macros')
    expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(true)
    expect(summary()).toBeTruthy()
    expect(screen.queryByText('Consumed')).toBeNull()
    expect(
      document.querySelector('[data-day-section="macros"]')?.getAttribute(
        'data-day-pin-sticky',
      ),
    ).toBe('true')
  })

  it('keeps a chevron collapse closed when the header scrolls (#1109)', async () => {
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: false },
    })
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    const user = userEvent.setup()
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
      main.remove()
    }
  })

  it('keeps sticky collapsed КБЖУ on screen when expanded without scrolling (#1049)', async () => {
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    const user = userEvent.setup()
    const main = document.createElement('div')
    main.id = 'main-content'
    document.body.appendChild(main)
    let scrollTop = 480
    Object.defineProperty(main, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value
      },
    })
    const scrollTo = vi.fn((opts: ScrollToOptions) => {
      if (typeof opts.top === 'number') scrollTop = opts.top
    })
    main.scrollTo = scrollTo as typeof main.scrollTo

    try {
      render(<Harness />, { container: main })
      expect(summary()).toBeTruthy()
      expect(
        document.querySelector('[data-day-section="macros"]')?.getAttribute(
          'data-day-pin-sticky',
        ),
      ).toBe('true')

      await user.click(
        screen.getByRole('button', { name: /Show calories & macros/ }),
      )

      expect(useTodaySectionsCollapseStore.getState().sections.macros).toBe(
        false,
      )
      expect(screen.getByText('Consumed')).toBeVisible()
      const section = document.querySelector('[data-day-section="macros"]')
      expect(section?.getAttribute('data-day-pin-sticky')).toBe('true')
      expect(section?.className ?? '').toMatch(/\bsticky\b/)
      expect(section).toHaveClass('shadow-md', 'z-[9]')
      expect(scrollTo).not.toHaveBeenCalled()
      expect(scrollTop).toBe(480)
    } finally {
      cleanup()
      main.remove()
    }
  })
})
