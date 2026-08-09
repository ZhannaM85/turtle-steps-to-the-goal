import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FieldBaseline } from '@/domain/dailyEntry'
import { useLocaleStore } from '@/i18n'
import { useEntryComparisonStore } from '@/stores'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'

const yesterdayBaseline: FieldBaseline = {
  date: '2026-08-08',
  value: 70,
  isYesterday: true,
}

describe('EntryFieldComparison (#664)', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
    useEntryComparisonStore.setState({ enabled: true })
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('shows a green down-arrow for a weight decrease vs yesterday while editing', async () => {
    render(
      <EntryFieldComparisonLive
        field="weightKg"
        currentValue={69.5}
        prior={yesterdayBaseline}
        unit="kg"
      />,
    )
    await vi.advanceTimersByTimeAsync(300)
    const text = screen.getByText(/↓ 0\.5 kg compared to yesterday/)
    expect(text.className).toMatch(/emerald/)
  })

  it('names the prior date when yesterday has no entry', async () => {
    render(
      <EntryFieldComparisonLive
        field="weightKg"
        currentValue={69}
        prior={{ date: '2026-07-25', value: 70, isYesterday: false }}
        unit="kg"
      />,
    )
    await vi.advanceTimersByTimeAsync(300)
    expect(
      screen.getByText(/↓ 1 kg compared to 25 July/),
    ).toBeInTheDocument()
  })

  it('hides when the Settings toggle is off', async () => {
    useEntryComparisonStore.setState({ enabled: false })
    render(
      <EntryFieldComparisonLive
        field="weightKg"
        currentValue={69}
        prior={yesterdayBaseline}
        unit="kg"
      />,
    )
    await vi.advanceTimersByTimeAsync(300)
    expect(screen.queryByText(/compared to yesterday/)).toBeNull()
  })

  it('renders an info tooltip with yesterday and 30-day lines after save', async () => {
    render(
      <EntryFieldComparisonInfo
        field="weightKg"
        currentValue={69}
        prior={yesterdayBaseline}
        day30Value={72}
        unit="kg"
      />,
    )
    expect(
      screen.getByRole('button', { name: /Comparison with previous days/i }),
    ).toBeInTheDocument()
  })
})
