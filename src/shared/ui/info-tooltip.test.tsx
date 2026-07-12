import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InfoTooltip } from './info-tooltip'

describe('InfoTooltip', () => {
  it('renders closed by default', () => {
    render(<InfoTooltip text="More detail here" label="About this field" />)

    expect(screen.queryByText('More detail here')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About this field' }),
    ).toBeInTheDocument()
  })

  it('opens on click (tap-to-open, not hover) and shows the text', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip text="More detail here" label="About this field" />)

    await user.click(screen.getByRole('button', { name: 'About this field' }))

    expect(await screen.findByText('More detail here')).toBeInTheDocument()
  })
})
