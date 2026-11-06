import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { WelcomeScreen } from './WelcomeScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderWelcomeScreen() {
  render(
    <MemoryRouter>
      <WelcomeScreen />
    </MemoryRouter>,
  )
}

describe('WelcomeScreen', () => {
  it('explains the app and links privacy, support, and the diary (#1119)', () => {
    renderWelcomeScreen()

    expect(
      screen.getByRole('heading', { name: 'Turtle Steps to the Goal' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/no account, no analytics/)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Open the diary' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(
      screen.getByRole('link', { name: 'Privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'App support' })).toHaveAttribute(
      'href',
      '/support',
    )
    expect(screen.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute(
      'href',
      'https://github.com/ZhannaM85',
    )
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderWelcomeScreen()

    expect(
      screen.getByRole('heading', { name: 'Черепашьи шаги к цели' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Поддержка' })).toHaveAttribute(
      'href',
      '/support',
    )
  })
})
