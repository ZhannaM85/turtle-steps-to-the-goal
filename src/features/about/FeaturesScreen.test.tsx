import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { FeaturesScreen } from './FeaturesScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderFeaturesScreen() {
  render(
    <MemoryRouter>
      <FeaturesScreen />
    </MemoryRouter>,
  )
}

describe('FeaturesScreen', () => {
  it('lists current feature categories and representative capabilities (#346, #495)', () => {
    renderFeaturesScreen()

    expect(
      screen.getByRole('heading', { name: 'Features' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Daily logging' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Track weight, calories, protein, fat, carbs, and fiber/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/five-point custom metrics/)).toBeInTheDocument()
    expect(
      screen.getByText(/muscle mass, visceral fat, body water, and bone mass/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Your data, your device' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no account, no cloud, no tracking/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Zepp Life, Apple Health, or MyFitnessPal/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Fill sleep from an AutoSleep screenshot/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/collapsed calories-and-macros line/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/optional LDL impact tags/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Order Recent by when you added/)).toBeInTheDocument()
    expect(
      screen.getByText(/Paste a food or a JSON list into your catalog/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Share the foods you select with one QR code/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Start the next weekly goal/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/LDL impact and reason in meal and day exports/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Search Settings to find a section/)).toBeInTheDocument()
  })

  it('shows a screenshot for every category (#497)', () => {
    renderFeaturesScreen()

    const expected = [
      ['App screenshot — Daily logging', 'screenshots/day.png'],
      ['App screenshot — Meals & food', 'screenshots/day-meals.png'],
      ['App screenshot — Goals & progress', 'screenshots/goal.png'],
      ['App screenshot — Dashboard & trends', 'screenshots/dashboard.png'],
      [
        'App screenshot — Correlations & insights',
        'screenshots/correlations.png',
      ],
      ['App screenshot — History', 'screenshots/history.png'],
      ['App screenshot — Your data, your device', 'screenshots/export.png'],
      ['App screenshot — Make it yours', 'screenshots/appearance.png'],
    ] as const

    for (const [alt, srcSuffix] of expected) {
      const img = screen.getByRole('img', { name: alt })
      expect(img).toHaveAttribute('src', expect.stringContaining(srcSuffix))
    }
  })

  it('links back to the About page', () => {
    renderFeaturesScreen()

    const link = screen.getByRole('link', { name: 'Back to About' })
    expect(link).toHaveAttribute('href', '/about')
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderFeaturesScreen()

    expect(
      screen.getByRole('heading', { name: 'Возможности' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ежедневные записи' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Скриншот приложения — Ежедневные записи',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/свёрнутую строку КБЖУ/)).toBeInTheDocument()
    expect(screen.getByText(/метки влияния на ЛПНП/)).toBeInTheDocument()
    expect(screen.getByText(/«Недавние» упорядочены/)).toBeInTheDocument()
    expect(screen.getByText(/JSON-список/)).toBeInTheDocument()
    expect(
      screen.getByText(/одним QR-кодом или одной ссылкой/),
    ).toBeInTheDocument()
    expect(screen.getByText(/следующую недельную цель/)).toBeInTheDocument()
    expect(
      screen.getByText(/экспорт приёмов пищи и дня/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ищите в «Настройках»/)).toBeInTheDocument()
  })
})
