import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppUpdateBanner } from './AppUpdateBanner'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppUpdateBanner', () => {
  it('renders nothing when the deployed version matches the running one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'dev' }),
      }),
    )

    const { container } = render(<AppUpdateBanner />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the version check fails (no version.json, e.g. local dev)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { container } = render(<AppUpdateBanner />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the banner once a different deployed version is detected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'some-newer-sha' }),
      }),
    )

    render(<AppUpdateBanner />)

    expect(
      await screen.findByText('A new version is available.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})
