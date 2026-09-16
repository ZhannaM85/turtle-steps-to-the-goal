import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('opens the native calendar when its invisible date field is clicked in Chrome (#924)', () => {
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    const input = screen.getByLabelText('Day') as HTMLInputElement
    const showPicker = vi.fn()
    input.showPicker = showPicker

    fireEvent.click(input)

    expect(showPicker).toHaveBeenCalledOnce()
  })

  it('does not open a disabled date picker (#924)', () => {
    render(<DateInput aria-label="Day" value="2026-09-13" disabled />)
    const input = screen.getByLabelText('Day') as HTMLInputElement
    const showPicker = vi.fn()
    input.showPicker = showPicker

    fireEvent.click(input)

    expect(showPicker).not.toHaveBeenCalled()
  })

  it('shows a Russian closed-state label when the app is Russian', () => {
    useLocaleStore.getState().setLocale('ru')
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    expect(screen.getByText('13 сент. 2026 г.')).toBeInTheDocument()
    expect(screen.queryByText(/Sep/)).not.toBeInTheDocument()
  })

  it('lets a caller override the default h-12 height (#885)', () => {
    render(
      <DateInput
        aria-label="Day"
        value="2026-09-13"
        className="h-[2.625rem]"
      />,
    )
    expect(screen.getByLabelText('Day').parentElement).toHaveClass(
      'h-[2.625rem]',
    )
    expect(screen.getByLabelText('Day').parentElement).toHaveClass('min-w-36')
    expect(screen.getByLabelText('Day').parentElement).not.toHaveClass('h-8')
  })

  it('keeps a readable min width when the value is empty (#887)', () => {
    render(<DateInput aria-label="Start date" value="" />)
    expect(screen.getByLabelText('Start date').parentElement).toHaveClass(
      'min-w-36',
    )
    expect(screen.getByLabelText('Start date').parentElement).not.toHaveClass(
      'min-w-0',
    )
  })

  it('does not clip the closed-state label (#884)', () => {
    useLocaleStore.getState().setLocale('ru')
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    const label = screen.getByText('13 сент. 2026 г.')
    expect(label).toHaveClass('whitespace-nowrap')
    expect(label).not.toHaveClass('truncate')
  })

  it('shows an English closed-state label when the app is English', () => {
    useLocaleStore.getState().setLocale('en')
    render(<DateInput aria-label="Day" value="2026-09-13" />)
    expect(screen.getByText(/Sep/)).toBeInTheDocument()
  })
})
