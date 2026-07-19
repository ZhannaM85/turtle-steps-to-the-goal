import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
  })
}

afterEach(() => {
  setOnline(true)
})

describe('OfflineBanner (#163)', () => {
  it('renders nothing while online', () => {
    setOnline(true)
    const { container } = render(<OfflineBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the offline text when navigator.onLine is false on mount', () => {
    setOnline(false)
    render(<OfflineBanner />)

    expect(
      screen.getByText("You're offline — your data is still saved on this device."),
    ).toBeInTheDocument()
  })

  it('reacts to the offline/online window events', () => {
    setOnline(true)
    render(<OfflineBanner />)

    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument()

    setOnline(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()

    setOnline(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument()
  })
})
