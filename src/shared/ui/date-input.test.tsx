import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useLocaleStore } from '@/i18n'
import { DateInput } from './date-input'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

describe('DateInput', () => {
  it('keeps a native date input so the picker still opens (#882)', () => {
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    const input = screen.getByLabelText('Day')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveValue('2026-09-13')
  })

  it('shows a Russian closed-state label when the app is Russian', () => {
    useLocaleStore.getState().setLocale('ru')
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    expect(screen.getByText(/сент/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sep/)).not.toBeInTheDocument()
  })

  it('shows an English closed-state label when the app is English', () => {
    useLocaleStore.getState().setLocale('en')
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    expect(screen.getByText(/Sep/)).toBeInTheDocument()
  })
})
