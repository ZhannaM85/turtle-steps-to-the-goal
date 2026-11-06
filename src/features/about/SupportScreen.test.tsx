import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { SUPPORT_EMAIL, SupportScreen } from './SupportScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderSupportScreen() {
  render(
    <MemoryRouter>
      <SupportScreen />
    </MemoryRouter>,
  )
}

describe('SupportScreen', () => {
  it('shows the public support email and FAQ (#1120)', () => {
    renderSupportScreen()

    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument()
    expect(screen.getByText('Common questions')).toBeInTheDocument()
    expect(screen.getByText(/no developer cloud copy/)).toBeInTheDocument()

    const mail = screen.getByRole('link', {
      name: `Email support: ${SUPPORT_EMAIL}`,
    })
    expect(mail).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`)
  })

  it('links to privacy and About', () => {
    renderSupportScreen()

    expect(
      screen.getByRole('link', { name: 'Read the privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Back to About' })).toHaveAttribute(
      'href',
      '/about',
    )
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderSupportScreen()

    expect(
      screen.getByRole('heading', { name: 'Поддержка' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Частые вопросы/)).toBeInTheDocument()
  })
})
