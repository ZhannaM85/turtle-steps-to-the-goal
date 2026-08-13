import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDictionary, useLocaleStore } from '@/i18n'
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  useDashboardChartVisibilityStore,
} from '@/stores'
import { DashboardChartsVisibilitySection } from './DashboardChartsVisibilitySection'
import { dashboardChartTitle } from './dashboardChartTitle'

describe('DashboardChartsVisibilitySection', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
    useDashboardChartVisibilityStore.setState({
      visible: Object.fromEntries(
        DEFAULT_DASHBOARD_SECTION_ORDER.map((key) => [key, true]),
      ) as ReturnType<
        typeof useDashboardChartVisibilityStore.getState
      >['visible'],
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('lists every built-in Dashboard section title', () => {
    const t = getDictionary('en')
    render(<DashboardChartsVisibilitySection />)
    for (const key of DEFAULT_DASHBOARD_SECTION_ORDER) {
      expect(
        screen.getByText(dashboardChartTitle(key, t)),
      ).toBeInTheDocument()
    }
  })

  it('toggles visibility through the shared store', async () => {
    const user = userEvent.setup()
    const t = getDictionary('en')
    render(<DashboardChartsVisibilitySection />)
    const title = dashboardChartTitle('calorieWeightCorrelation', t)
    const group = screen.getByRole('radiogroup', { name: title })
    await user.click(within(group).getByRole('radio', { name: 'Off' }))
    expect(
      useDashboardChartVisibilityStore.getState().visible
        .calorieWeightCorrelation,
    ).toBe(false)
    await user.click(within(group).getByRole('radio', { name: 'On' }))
    expect(
      useDashboardChartVisibilityStore.getState().visible
        .calorieWeightCorrelation,
    ).toBe(true)
  })
})
