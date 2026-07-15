import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useThemeStore, useUnitStore } from '@/stores'
import { SettingsScreen } from './SettingsScreen'

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  useUnitStore.setState({ unit: 'kg' })
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
  useUnitStore.setState({ unit: 'kg' })
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

  it('defaults to kg units', () => {
    render(<SettingsScreen />)

    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked()
  })

  it('switches the unit preference when lb is selected', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    await user.click(screen.getByRole('radio', { name: 'lb' }))

    expect(screen.getByRole('radio', { name: 'lb' })).toBeChecked()
    expect(useUnitStore.getState().unit).toBe('lb')
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

  it('keeps the visually-hidden mood radios keyboard-focusable', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen />)

    const pondRadio = screen.getByRole('radio', { name: /Pond/ })
    // Radio groups use roving tabindex — Tab lands on each group's checked
    // radio directly, not every individual option.
    await user.tab() // units group's checked radio (kg)
    await user.tab() // locale group's checked radio (English)
    await user.tab() // mood group's checked radio (Pond)

    expect(document.activeElement).toBe(pondRadio)
  })

  it('includes the meal items library section (#50)', () => {
    render(<SettingsScreen />)

    expect(
      screen.getByRole('heading', { name: 'Meal items' }),
    ).toBeInTheDocument()
  })

  it('includes the release notes section (#63)', () => {
    render(<SettingsScreen />)

    expect(
      screen.getByRole('heading', { name: 'Release notes' }),
    ).toBeInTheDocument()
  })

  it('includes the export/import section (folded in from the old Export tab, #24)', () => {
    render(<SettingsScreen />)

    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Export backup' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Import backup' }),
    ).toBeInTheDocument()
  })
})
