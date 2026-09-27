import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DayPinnedFlow, DayPinFrame, DayPinProvider } from './DaySectionPin'
import { useDaySectionPinStore } from '@/stores/daySectionPinStore'
import {
  DEFAULT_TODAY_SECTIONS,
  useTodaySectionsCollapseStore,
} from '@/stores/todaySectionsCollapseStore'

function rect(height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 100,
    height,
    top: 0,
    left: 0,
    right: 100,
    bottom: height,
    toJSON() {
      return {}
    },
  } as DOMRect
}

function precedes(earlier: Element | null, later: Element | null) {
  if (!earlier || !later) return false
  return (
    (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  )
}

function section(id: string) {
  return document.querySelector(`[data-day-section="${id}"]`)
}

function Harness() {
  return (
    <DayPinProvider>
      <div data-slot="day-intro" />
      <div data-slot="day-sections">
        <DayPinnedFlow />
        <DayPinFrame id="nutritionFacts" stick={false}>
          <p>Notes</p>
        </DayPinFrame>
        <DayPinFrame id="macros">
          <p>KBJU</p>
        </DayPinFrame>
        <DayPinFrame id="meals">
          <p>Meals</p>
        </DayPinFrame>
      </div>
    </DayPinProvider>
  )
}

describe('Day pin order (#1031)', () => {
  beforeEach(() => {
    localStorage.clear()
    useDaySectionPinStore.setState({ pinned: [] })
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('puts an expanded pin first and does not stick it', () => {
    useDaySectionPinStore.setState({ pinned: ['macros'] })
    render(<Harness />)

    const macros = section('macros')
    const notes = section('nutritionFacts')
    expect(macros?.closest('[data-slot="day-pinned-flow"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="day-pinned-flow"]')).toHaveClass(
      'contents',
    )
    expect(document.querySelector('[data-day-pin-flow="macros"]')).toHaveClass(
      'contents',
    )
    expect(macros?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(
      document.querySelector('[data-slot="day-pinned-flow"]')?.closest('[data-slot="day-intro"]'),
    ).toBeNull()
    expect(macros?.getAttribute('data-day-pin-sticky')).toBe('false')
    expect(macros?.className ?? '').not.toMatch(/\bsticky\b/)
    expect(precedes(macros, notes)).toBe(true)
    expect(screen.getByText('KBJU')).toBeVisible()
  })

  it('keeps several expanded pins above unpinned sections in pin order', () => {
    useDaySectionPinStore.setState({ pinned: ['meals', 'macros'] })
    render(<Harness />)

    const meals = section('meals')
    const macros = section('macros')
    const notes = section('nutritionFacts')
    expect(meals?.getAttribute('data-day-pin-sticky')).toBe('false')
    expect(macros?.getAttribute('data-day-pin-sticky')).toBe('false')
    expect(precedes(meals, macros)).toBe(true)
    expect(precedes(macros, notes)).toBe(true)
  })

  it('returns an unpinned section to document order', () => {
    useDaySectionPinStore.setState({ pinned: [] })
    render(<Harness />)

    expect(precedes(section('nutritionFacts'), section('macros'))).toBe(true)
    expect(precedes(section('macros'), section('meals'))).toBe(true)
    expect(document.querySelector('[data-slot="day-pinned-flow"]')).toBeNull()
  })

  it('sticks collapsed pins under the date chrome without putting them in it', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute('data-slot') === 'day-intro') return rect(80)
        if (this.getAttribute('data-day-section') === 'macros') return rect(48)
        if (this.getAttribute('data-day-section') === 'meals') return rect(36)
        return rect(0)
      },
    )
    useTodaySectionsCollapseStore.setState({
      sections: { ...DEFAULT_TODAY_SECTIONS, macros: true, meals: true },
    })
    useDaySectionPinStore.setState({ pinned: ['macros', 'meals'] })
    render(<Harness />)

    const macros = section('macros')
    const meals = section('meals')
    expect(macros?.getAttribute('data-day-pin-sticky')).toBe('true')
    expect(meals?.getAttribute('data-day-pin-sticky')).toBe('true')
    expect(macros?.className ?? '').toMatch(/\bsticky\b/)
    expect(meals?.className ?? '').toMatch(/\bsticky\b/)
    expect(macros?.closest('[data-slot="day-intro"]')).toBeNull()
    expect(precedes(macros, meals)).toBe(true)
    expect(precedes(meals, section('nutritionFacts'))).toBe(true)
    expect(macros).toHaveStyle({ top: '80px' })
    expect(meals).toHaveStyle({ top: '128px' })
  })
})
