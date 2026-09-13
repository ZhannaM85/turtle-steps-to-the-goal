import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { en } from './en'
import { ru } from './ru'
import {
  detectDefaultLocale,
  getDictionary,
  useLocaleStore,
} from './localeStore'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
})

describe('detectDefaultLocale', () => {
  it('defaults to English for a non-Russian browser language', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    })
    expect(detectDefaultLocale()).toBe('en')
    Object.defineProperty(navigator, 'language', {
      value: original,
      configurable: true,
    })
  })

  it('defaults to Russian for a Russian browser language', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'ru-RU',
      configurable: true,
    })
    expect(detectDefaultLocale()).toBe('ru')
    Object.defineProperty(navigator, 'language', {
      value: original,
      configurable: true,
    })
  })
})

describe('feature dictionaries (#871)', () => {
  it('keeps English and Russian top-level sections aligned', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())
  })
})

describe('getDictionary', () => {
  it('returns the matching dictionary for each locale', () => {
    expect(getDictionary('en')).toBe(en)
    expect(getDictionary('ru')).toBe(ru)
  })
})

describe('useLocaleStore', () => {
  it('updates the locale via setLocale', () => {
    useLocaleStore.getState().setLocale('ru')
    expect(useLocaleStore.getState().locale).toBe('ru')
  })

  it('sets document.documentElement.lang to match Settings (#882)', () => {
    useLocaleStore.getState().setLocale('ru')
    expect(document.documentElement.lang).toBe('ru')
    useLocaleStore.getState().setLocale('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('persists the locale to localStorage', () => {
    useLocaleStore.getState().setLocale('ru')
    const stored = localStorage.getItem('turtle-steps-locale')
    expect(stored).toContain('"locale":"ru"')
  })
})
