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
  it('lists every feature category with its own bullet points (#346)', () => {
    renderFeaturesScreen()

    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Daily logging' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Track weight, calories, protein, fat, and carbs/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Your data, your device' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no account, no cloud, no tracking/),
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
