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
  it('explains what the app is and its no-big-goal philosophy', () => {
    render(<AboutScreen />)

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(
      screen.getByText(/small, personal weight-tracking app/),
    ).toBeInTheDocument()
    expect(screen.getByText(/no long-term target to chase/)).toBeInTheDocument()
    expect(screen.getByText(/stays on your own device/)).toBeInTheDocument()
  })

  it('credits the author with a link to their GitHub profile', () => {
    render(<AboutScreen />)

    const link = screen.getByRole('link', { name: 'Made by zhannam85' })
    expect(link).toHaveAttribute('href', 'https://github.com/ZhannaM85')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
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
