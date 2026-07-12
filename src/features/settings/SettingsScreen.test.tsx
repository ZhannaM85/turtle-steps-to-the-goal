import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useThemeStore } from '@/stores'
import { SettingsScreen } from './SettingsScreen'

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

describe('SettingsScreen', () => {
  it('renders in English by default', () => {
    render(<SettingsScreen />)

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
  })

  it('switches the whole dictionary to Russian when selected', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    await user.click(screen.getByRole('radio', { name: 'Russian' }))

    expect(
      screen.getByRole('heading', { name: 'Настройки' }),
    ).toBeInTheDocument()
    expect(useLocaleStore.getState().locale).toBe('ru')
  })

  it('defaults to the Pond mood and light scheme', () => {
    render(<SettingsScreen />)

    expect(screen.getByRole('radio', { name: /Pond/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
  })

  it('switches mood and applies it to the DOM', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    await user.click(screen.getByRole('radio', { name: /Lagoon/ }))

    expect(useThemeStore.getState().mood).toBe('lagoon')
    expect(document.documentElement.dataset.mood).toBe('lagoon')
  })

  it('switches color scheme and applies it to the DOM', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(useThemeStore.getState().colorScheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
