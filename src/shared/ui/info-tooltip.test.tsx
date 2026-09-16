import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  CONTROL_INFO_TOOLTIP_CLASS,
  CONTROL_WITH_INFO_CLASS,
  ControlWithInfo,
  InfoTooltip,
} from './info-tooltip'

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

  it('keeps a control and info icon in a tight fixed-gap row (#943)', () => {
    render(
      <ControlWithInfo>
        <button type="button">Export as CSV</button>
        <InfoTooltip
          text="CSV is compact"
          label="Why CSV for AI analysis"
          className={CONTROL_INFO_TOOLTIP_CLASS}
        />
      </ControlWithInfo>,
    )

    const row = screen.getByRole('button', { name: 'Export as CSV' }).closest(
      '[data-slot="control-with-info"]',
    )
    expect(row).toHaveClass(
      'inline-flex',
      'w-fit',
      'justify-start',
      'gap-2',
    )
    expect(row).not.toHaveClass('justify-between')
    expect(row?.className).toBe(
      // sanity: the shared class is applied whole, not mixed with stretch
      CONTROL_WITH_INFO_CLASS,
    )
    const info = screen.getByRole('button', { name: 'Why CSV for AI analysis' })
    expect(info).toHaveClass('size-6')
    expect(info).not.toHaveClass('size-11')
  })
})
