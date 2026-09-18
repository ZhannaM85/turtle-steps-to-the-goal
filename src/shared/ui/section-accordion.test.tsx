import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SectionAccordion } from './section-accordion'

function Harness({
  shell,
  subtitle,
}: {
  shell?: boolean
  subtitle?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <SectionAccordion
      open={open}
      onOpenChange={setOpen}
      title="Morning"
      subtitle={subtitle}
      expandLabel="Expand morning"
      collapseLabel="Collapse morning"
      shell={shell}
    >
      <p>Weight field</p>
    </SectionAccordion>
  )
}

describe('SectionAccordion (#876)', () => {
  it('uses one full-width trigger and section-shell by default', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness subtitle="Optional fields" />)

    expect(container.firstChild).toHaveClass('section-shell')
    expect(screen.getByText('Optional fields')).toBeInTheDocument()
    expect(screen.getByText('Weight field')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse morning' }))
    expect(
      screen.getByRole('button', { name: 'Expand morning' }),
    ).toBeInTheDocument()
  })

  it('keeps the chevron transparent, without a filled chip (#967)', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Collapse morning' })
    const chevron = trigger.querySelector('[data-slot="collapse-chevron"]')

    expect(trigger.className).not.toMatch(/\bbg-muted\b/)
    expect(chevron).toHaveClass('bg-transparent')
    expect(chevron?.getAttribute('class')).not.toMatch(/\bbg-muted\b/)
  })

  it('can drop the shell when the body is already number cards', () => {
    const { container } = render(<Harness shell={false} />)

    expect(container.firstChild).not.toHaveClass('section-shell')
    expect(
      screen.getByRole('button', { name: 'Collapse morning' }),
    ).toBeInTheDocument()
  })
})
