import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { AboutScreen } from './AboutScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

describe('AboutScreen', () => {
  it('explains what the app is and its no-big-goal philosophy (#213)', () => {
    render(<AboutScreen />)

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(
      screen.getByText(/Weight changes are influenced by many factors/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Track your weight alongside calories/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/steady weekly progress through small, consistent steps/),
    ).toBeInTheDocument()
    expect(screen.getByText('Private by design.')).toBeInTheDocument()
    expect(
      screen.getByText(/stored locally on your device/),
    ).toBeInTheDocument()
  })

  it('credits the author with a link to their GitHub profile', () => {
    render(<AboutScreen />)

    const link = screen.getByRole('link', { name: 'Made by zhannam85' })
    expect(link).toHaveAttribute('href', 'https://github.com/ZhannaM85')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows the current version number', () => {
    render(<AboutScreen />)

    expect(screen.getByText(/^Version \d+$/)).toBeInTheDocument()
  })

  it('includes the release notes section, moved here from Settings (#66)', () => {
    render(<AboutScreen />)

    expect(
      screen.getByRole('heading', { name: 'Release notes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show release notes' }),
    ).toBeInTheDocument()
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    render(<AboutScreen />)

    expect(
      screen.getByRole('heading', { name: 'О приложении' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Автор: zhannam85')).toBeInTheDocument()
  })
})
