import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'

function touch(clientY: number) {
  return { touches: [{ clientY }] }
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true })
}

afterEach(() => {
  vi.unstubAllGlobals()
  setScrollY(0)
})

describe('PullToRefreshIndicator', () => {
  it('renders nothing at rest', () => {
    const { container } = render(<PullToRefreshIndicator />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a growing indicator while dragging down from the top of the page', () => {
    const { container } = render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(0))
    fireEvent.touchMove(document, touch(30))

    expect(container).not.toBeEmptyDOMElement()
  })

  it('reloads once the pull threshold is crossed', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(0))
    fireEvent.touchMove(document, touch(90))
    fireEvent.touchEnd(document)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when released before the threshold', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const { container } = render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(0))
    fireEvent.touchMove(document, touch(30))
    fireEvent.touchEnd(document)

    expect(reload).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('does nothing when the page is not scrolled to the top', () => {
    setScrollY(100)
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const { container } = render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(0))
    fireEvent.touchMove(document, touch(90))
    fireEvent.touchEnd(document)

    expect(reload).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('does nothing when dragging upward', () => {
    const { container } = render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(50))
    fireEvent.touchMove(document, touch(10))

    expect(container).toBeEmptyDOMElement()
  })

  it('shows a spinning state while refresh is in progress', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<PullToRefreshIndicator />)

    fireEvent.touchStart(document, touch(0))
    fireEvent.touchMove(document, touch(90))
    fireEvent.touchEnd(document)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
