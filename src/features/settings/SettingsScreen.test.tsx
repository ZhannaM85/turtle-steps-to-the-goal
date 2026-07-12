import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { SettingsScreen } from './SettingsScreen'

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
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
})
