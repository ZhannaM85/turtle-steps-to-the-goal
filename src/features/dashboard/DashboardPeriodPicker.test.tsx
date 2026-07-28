import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useDashboardPeriodStore } from '@/stores'
import { DashboardPeriodPicker } from './DashboardPeriodPicker'

afterEach(() => {
  useDashboardPeriodStore.setState({
    period: 'all',
    customStart: '',
    customEnd: '',
  })
})

describe('DashboardPeriodPicker', () => {
  it('defaults to "All time" selected, matching pre-#380 behavior', () => {
    render(<DashboardPeriodPicker />)

    expect(
      screen.getByRole('radio', { name: 'All time', checked: true }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Chart period — Start date'),
    ).not.toBeInTheDocument()
  })

  it('offers Week/Month/Year/Custom alongside All time', () => {
    render(<DashboardPeriodPicker />)

    expect(screen.getByRole('radio', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Year' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Custom' })).toBeInTheDocument()
  })

  it('selecting Week updates the store', async () => {
    const user = userEvent.setup()
    render(<DashboardPeriodPicker />)

    await user.click(screen.getByRole('radio', { name: 'Week' }))

    expect(useDashboardPeriodStore.getState().period).toBe('week')
    expect(
      screen.getByRole('radio', { name: 'Week', checked: true }),
    ).toBeInTheDocument()
  })

  it('shows the custom date range inputs only once Custom is selected', async () => {
    const user = userEvent.setup()
    render(<DashboardPeriodPicker />)

    await user.click(screen.getByRole('radio', { name: 'Custom' }))

    const startInput = screen.getByLabelText('Chart period — Start date')
    const endInput = screen.getByLabelText('Chart period — End date')
    expect(startInput).toBeInTheDocument()
    expect(endInput).toBeInTheDocument()

    await user.type(startInput, '2026-01-01')
    await user.type(endInput, '2026-02-01')

    expect(useDashboardPeriodStore.getState().customStart).toBe('2026-01-01')
    expect(useDashboardPeriodStore.getState().customEnd).toBe('2026-02-01')
  })

  it('keeps exactly one period selected — clicking the active option again does not deselect it', async () => {
    const user = userEvent.setup()
    render(<DashboardPeriodPicker />)

    await user.click(screen.getByRole('radio', { name: 'All time' }))

    expect(useDashboardPeriodStore.getState().period).toBe('all')
    expect(
      screen.getByRole('radio', { name: 'All time', checked: true }),
    ).toBeInTheDocument()
  })
})
