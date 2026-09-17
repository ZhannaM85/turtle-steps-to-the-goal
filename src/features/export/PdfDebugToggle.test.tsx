import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { isPdfDebugEnabled, PDF_DEBUG_STORAGE_KEY } from './pdfDebug'
import { PdfDebugToggle } from './PdfDebugToggle'

describe('PdfDebugToggle (#952)', () => {
  beforeEach(() => {
    localStorage.removeItem(PDF_DEBUG_STORAGE_KEY)
    useLocaleStore.setState({ locale: 'en' })
  })

  afterEach(() => {
    localStorage.removeItem(PDF_DEBUG_STORAGE_KEY)
  })

  it('starts off and persists On to localStorage pdfDebug', async () => {
    const user = userEvent.setup()
    render(<PdfDebugToggle />)

    const group = screen.getByRole('radiogroup', {
      name: 'Temporary PDF layout debug',
    })
    expect(within(group).getByRole('radio', { name: 'Off' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(isPdfDebugEnabled()).toBe(false)

    await user.click(within(group).getByRole('radio', { name: 'On' }))
    expect(localStorage.getItem(PDF_DEBUG_STORAGE_KEY)).toBe('1')
    expect(isPdfDebugEnabled()).toBe(true)
    expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute(
      'data-state',
      'on',
    )
  })

  it('turns Off by clearing localStorage so isPdfDebugEnabled is false', async () => {
    localStorage.setItem(PDF_DEBUG_STORAGE_KEY, '1')
    const user = userEvent.setup()
    render(<PdfDebugToggle />)

    const group = screen.getByRole('radiogroup', {
      name: 'Temporary PDF layout debug',
    })
    expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute(
      'data-state',
      'on',
    )

    await user.click(within(group).getByRole('radio', { name: 'Off' }))
    expect(localStorage.getItem(PDF_DEBUG_STORAGE_KEY)).toBeNull()
    expect(isPdfDebugEnabled()).toBe(false)
  })

  it('labels the control as temporary PDF layout debug', () => {
    render(<PdfDebugToggle />)
    expect(
      screen.getByText(
        'Shows a yellow overlay and outlines when you export a PDF, so layout numbers can be checked on this device. Turn this off when you are done.',
      ),
    ).toBeInTheDocument()
  })
})
