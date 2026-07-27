import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { PrivacyScreen } from './PrivacyScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderPrivacyScreen() {
  render(
    <MemoryRouter>
      <PrivacyScreen />
    </MemoryRouter>,
  )
}

describe('PrivacyScreen', () => {
  it('explains what data is collected, where it lives, and that it is never shared (#312)', () => {
    renderPrivacyScreen()

    expect(
      screen.getByRole('heading', { name: 'Privacy Policy' }),
    ).toBeInTheDocument()
    expect(screen.getByText('What we collect')).toBeInTheDocument()
    expect(
      screen.getByText(/doesn't collect any data automatically/),
    ).toBeInTheDocument()
    expect(screen.getByText('Where your data lives')).toBeInTheDocument()
    expect(screen.getByText(/no account, no server/)).toBeInTheDocument()
    expect(screen.getByText('Sharing with third parties')).toBeInTheDocument()
    expect(screen.getByText(/never sold, shared/)).toBeInTheDocument()
  })

  it('links back to the About page', () => {
    renderPrivacyScreen()

    const link = screen.getByRole('link', { name: 'Back to About' })
    expect(link).toHaveAttribute('href', '/about')
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderPrivacyScreen()

    expect(
      screen.getByRole('heading', { name: 'Политика конфиденциальности' }),
    ).toBeInTheDocument()
  })
})
