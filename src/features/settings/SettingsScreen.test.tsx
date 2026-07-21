import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import {
  useDailyReminderStore,
  useDigestionTrackingStore,
  useThemeStore,
  useTrendChartSeriesStore,
  useUnitStore,
  useWeekStartStore,
} from '@/stores'
import { SettingsScreen } from './SettingsScreen'

function renderSettings() {
  return render(<SettingsScreen />, { wrapper: MemoryRouter })
}

const defaultTrendChartVisible = {
  weight: { raw: true, average: true },
  calories: { raw: true, average: true },
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  useUnitStore.setState({ unit: 'kg' })
  useWeekStartStore.setState({ weekStart: 'monday' })
  useDigestionTrackingStore.setState({ enabled: false })
  useDailyReminderStore.setState({ enabled: false })
  useTrendChartSeriesStore.setState({ visible: defaultTrendChartVisible })
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  useUnitStore.setState({ unit: 'kg' })
  useWeekStartStore.setState({ weekStart: 'monday' })
  useDigestionTrackingStore.setState({ enabled: false })
  useDailyReminderStore.setState({ enabled: false })
  useTrendChartSeriesStore.setState({ visible: defaultTrendChartVisible })
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

describe('SettingsScreen', () => {
  it('renders in English by default', () => {
    renderSettings()

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
  })

  it('defaults to kg units', () => {
    renderSettings()

    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked()
  })

  it('sizes toggle-group controls to match the h-12 standard used elsewhere in the app (#194)', () => {
    renderSettings()

    expect(screen.getByRole('radio', { name: 'kg' })).toHaveClass('h-12')
    expect(screen.getByRole('radio', { name: 'English' })).toHaveClass('h-12')
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveClass('h-12')
  })

  it('switches the unit preference when lb is selected', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('radio', { name: 'lb' }))

    expect(screen.getByRole('radio', { name: 'lb' })).toBeChecked()
    expect(useUnitStore.getState().unit).toBe('lb')
  })

  it('defaults to Monday week start', () => {
    renderSettings()

    expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked()
  })

  it('switches the week-start preference when selected (#85)', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(
      screen.getByRole('radio', { name: 'Day of my first entry' }),
    )

    expect(
      screen.getByRole('radio', { name: 'Day of my first entry' }),
    ).toBeChecked()
    expect(useWeekStartStore.getState().weekStart).toBe('firstEntryWeekday')
  })

  it('switches the whole dictionary to Russian when selected', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('radio', { name: 'Russian' }))

    expect(
      screen.getByRole('heading', { name: 'Настройки' }),
    ).toBeInTheDocument()
    expect(useLocaleStore.getState().locale).toBe('ru')
  })

  it('defaults to the Pond mood and light scheme', () => {
    renderSettings()

    expect(screen.getByRole('radio', { name: /Pond/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
  })

  it('switches mood and applies it to the DOM', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('radio', { name: /Lagoon/ }))

    expect(useThemeStore.getState().mood).toBe('lagoon')
    expect(document.documentElement.dataset.mood).toBe('lagoon')
  })

  it('switches color scheme and applies it to the DOM', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(useThemeStore.getState().colorScheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('keeps the visually-hidden mood radios keyboard-focusable', async () => {
    const user = userEvent.setup()
    renderSettings()

    const pondRadio = screen.getByRole('radio', { name: /Pond/ })
    // Radio groups use roving tabindex — Tab lands on each group's checked
    // radio directly, not every individual option.
    await user.tab() // units group's checked radio (kg)
    await user.tab() // week-start group's checked radio (Monday)
    await user.tab() // locale group's checked radio (English)
    await user.tab() // mood group's checked radio (Pond)

    expect(document.activeElement).toBe(pondRadio)
  })

  it('includes the meal items library section (#50)', () => {
    renderSettings()

    expect(
      screen.getByRole('heading', { name: 'Meal items' }),
    ).toBeInTheDocument()
  })

  it('includes a link to manage the curated food list (#90)', () => {
    renderSettings()

    expect(
      screen.getByRole('heading', { name: 'Food list' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Manage food list' }),
    ).toHaveAttribute('href', '/settings/foods')
  })

  it('defaults digestion tracking to off, and switches it on when selected', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(
      within(
        screen.getByRole('radiogroup', {
          name: 'Digestion tracking',
        }),
      ).getByRole('radio', { name: 'Off' }),
    ).toBeChecked()

    await user.click(
      within(
        screen.getByRole('radiogroup', { name: 'Digestion tracking' }),
      ).getByRole('radio', { name: 'On' }),
    )

    expect(useDigestionTrackingStore.getState().enabled).toBe(true)
  })

  it('defaults the daily reminder to off, and switches it on when selected (#171)', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(
      within(
        screen.getByRole('radiogroup', { name: 'Daily reminder' }),
      ).getByRole('radio', { name: 'Off' }),
    ).toBeChecked()

    await user.click(
      within(
        screen.getByRole('radiogroup', { name: 'Daily reminder' }),
      ).getByRole('radio', { name: 'On' }),
    )

    expect(useDailyReminderStore.getState().enabled).toBe(true)
  })

  it('includes the export/import section (folded in from the old Export tab, #24)', () => {
    renderSettings()

    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Export backup' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Import backup' }),
    ).toBeInTheDocument()
  })

  describe('Dashboard trend chart series (#238)', () => {
    it('recovers a series that was turned off on the Dashboard itself', async () => {
      // Simulates arriving here after the exact live scenario reported:
      // both series turned off on the Weight trend chart, no way back
      // there except this Settings card.
      useTrendChartSeriesStore.setState({
        visible: { weight: { raw: false, average: true }, calories: { raw: true, average: true } },
      })
      const user = userEvent.setup()
      renderSettings()

      const rawToggle = screen.getByRole('button', { name: 'weight' })
      expect(rawToggle).toHaveAttribute('aria-pressed', 'false')

      await user.click(rawToggle)

      expect(rawToggle).toHaveAttribute('aria-pressed', 'true')
      expect(useTrendChartSeriesStore.getState().visible.weight.raw).toBe(
        true,
      )
    })
  })
})
