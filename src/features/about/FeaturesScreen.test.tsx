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
  })
})
