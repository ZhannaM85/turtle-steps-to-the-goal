import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { AboutScreen } from './AboutScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderAboutScreen() {
  render(
    <MemoryRouter>
      <AboutScreen />
    </MemoryRouter>,
  )
}

describe('AboutScreen', () => {
  it('summarizes the current app and its no-big-goal philosophy (#213, #495)', () => {
    renderAboutScreen()

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(
      screen.getByText(/private, local-first companion/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/meals, macros, hydration, sleep, activity/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /steady weekly progress through small, consistent steps/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Private by design.')).toBeInTheDocument()
    expect(
      screen.getByText(/stored locally on your device/),
    ).toBeInTheDocument()
  })

  it('credits the author with a link to their GitHub profile', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', { name: 'Made by zhannam85' })
    expect(link).toHaveAttribute('href', 'https://github.com/ZhannaM85')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links to the full privacy policy page (#312)', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', {
      name: 'Read the full privacy policy',
    })
    expect(link).toHaveAttribute('href', '/privacy')
  })

  it('links to the features overview page (#346)', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', {
      name: 'See everything the app can do',
    })
    expect(link).toHaveAttribute('href', '/features')
  })

  it('shows the current version number', () => {
    renderAboutScreen()

    expect(screen.getByText(/^Version \d+$/)).toBeInTheDocument()
  })

  it('includes the release notes section, moved here from Settings (#66)', () => {
    renderAboutScreen()

    expect(
      screen.getByRole('heading', { name: 'Release notes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show release notes' }),
    ).toBeInTheDocument()
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderAboutScreen()

    expect(
      screen.getByRole('heading', { name: 'О приложении' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Автор: zhannam85')).toBeInTheDocument()
  })
})
