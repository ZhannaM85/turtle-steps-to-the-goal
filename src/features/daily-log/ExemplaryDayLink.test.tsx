import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { useLocaleStore } from '@/i18n'
import { useExemplaryDayStore } from '@/stores/exemplaryDayStore'
import { useUnitStore } from '@/stores/unitStore'
import { ExemplaryDayLink } from './ExemplaryDayLink'

function meals(totalKcal: number): CalorieEntry[] {
  return [1, 2, 3].map((index) => ({
    id: `meal-${index}-${totalKcal}`,
    createdAt: '2026-03-01T00:00:00.000Z',
    items: [{ id: `item-${index}-${totalKcal}`, amountKcal: totalKcal / 3 }],
  }))
}

function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  return {
    id: date,
    date,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

const healthyWeek = [
  entry('2026-03-02', { weightKg: 80, calorieEntries: meals(1800) }),
  entry('2026-03-09', { weightKg: 79.5 }),
]

function renderLink(
  overrides: Partial<Parameters<typeof ExemplaryDayLink>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <ExemplaryDayLink
        viewedDate="2026-03-10"
        entries={healthyWeek}
        targetWeeklyLossKg={0.5}
        dailyCalorieTargetKcal={1800}
        {...overrides}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useUnitStore.setState({ unit: 'kg' })
  useExemplaryDayStore.setState({
    enabled: false,
    pinnedDate: null,
    dismissedDates: [],
  })
})

describe('ExemplaryDayLink (#1125)', () => {
  it('stays hidden while the setting is off', () => {
    renderLink()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links to the day near the weekly pace', () => {
    useExemplaryDayStore.setState({ enabled: true })
    renderLink()

    expect(
      screen.getByRole('link', { name: 'A day close to your pace — 2 Mar' }),
    ).toHaveAttribute('href', '/?date=2026-03-02')
  })

  it('hides the link on the exemplary day itself', () => {
    useExemplaryDayStore.setState({ enabled: true })
    renderLink({ viewedDate: '2026-03-02' })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not suggest a 400 kcal day', () => {
    useExemplaryDayStore.setState({ enabled: true })
    renderLink({
      entries: [
        entry('2026-03-02', { weightKg: 80, calorieEntries: meals(400) }),
        entry('2026-03-09', { weightKg: 79.5 }),
      ],
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('uses a pinned day, and Change can clear it or pin the open day', async () => {
    const user = userEvent.setup()
    useExemplaryDayStore.setState({ enabled: true, pinnedDate: '2026-01-15' })
    renderLink()

    expect(
      screen.getByRole('link', {
        name: 'A day you chose as a reference — 15 Jan',
      }),
    ).toHaveAttribute('href', '/?date=2026-01-15')

    await user.click(screen.getByRole('button', { name: 'Change' }))
    const candidate = screen.getByRole('button', { name: /2 Mar/ })
    expect(candidate).toHaveTextContent('1,800 kcal')
    expect(candidate).toHaveTextContent('-0.5 kg')

    await user.click(screen.getByRole('button', { name: 'Use this day' }))
    expect(useExemplaryDayStore.getState().pinnedDate).toBe('2026-03-10')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('drops a dismissed day from the suggestion', async () => {
    const user = userEvent.setup()
    useExemplaryDayStore.setState({ enabled: true })
    renderLink()

    await user.click(screen.getByRole('button', { name: 'Change' }))
    await user.click(screen.getByRole('button', { name: "Don't suggest this" }))

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(useExemplaryDayStore.getState().dismissedDates).toEqual(['2026-03-02'])
  })
})
