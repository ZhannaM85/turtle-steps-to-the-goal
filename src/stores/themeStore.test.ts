import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  detectDefaultColorScheme,
  useThemeStore,
} from './themeStore'

function mockPrefersDark(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-mood')
  document.documentElement.classList.remove('dark')
  useThemeStore.setState({ mood: 'pond', colorScheme: 'light' })
})

describe('detectDefaultColorScheme', () => {
  it('returns light when the OS has no dark preference', () => {
    mockPrefersDark(false)
    expect(detectDefaultColorScheme()).toBe('light')
  })

  it('returns dark when the OS prefers dark', () => {
    mockPrefersDark(true)
    expect(detectDefaultColorScheme()).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('sets data-mood and toggles the dark class', () => {
    applyTheme('lagoon', 'dark')
    expect(document.documentElement.dataset.mood).toBe('lagoon')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    applyTheme('sage', 'light')
    expect(document.documentElement.dataset.mood).toBe('sage')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('useThemeStore', () => {
  it('updates mood via setMood and applies it to the DOM', () => {
    useThemeStore.getState().setMood('tortoise')
    expect(useThemeStore.getState().mood).toBe('tortoise')
    expect(document.documentElement.dataset.mood).toBe('tortoise')
  })

  it('updates colorScheme via setColorScheme and applies it to the DOM', () => {
    useThemeStore.getState().setColorScheme('dark')
    expect(useThemeStore.getState().colorScheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists mood and colorScheme to localStorage', () => {
    useThemeStore.getState().setMood('dusk')
    useThemeStore.getState().setColorScheme('dark')

    const stored = JSON.parse(localStorage.getItem('turtle-steps-theme')!)
    expect(stored.state.mood).toBe('dusk')
    expect(stored.state.colorScheme).toBe('dark')
  })
})
