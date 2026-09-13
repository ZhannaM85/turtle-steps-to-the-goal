import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InfoTooltip } from './info-tooltip'

describe('InfoTooltip', () => {
  it('renders closed by default', () => {
    render(<InfoTooltip text="More detail here" label="About this field" />)

    expect(screen.queryByText('More detail here')).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'About this field' })
    expect(trigger).toBeInTheDocument()
    expect(trigger.className).toMatch(/size-11/)
    expect(
      trigger.querySelector('[data-slot="info-tooltip-anchor"]'),
    ).toBeInTheDocument()
  })

  it('opens on click (tap-to-open, not hover) and shows the text', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip text="More detail here" label="About this field" />)

    await user.click(screen.getByRole('button', { name: 'About this field' }))

    expect(await screen.findByText('More detail here')).toBeInTheDocument()
  })
})
