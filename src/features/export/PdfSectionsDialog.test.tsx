import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  EMPTY_PDF_SECTION_AVAILABILITY,
  type PdfSectionAvailability,
  type PdfSectionTrackingGate,
} from './exportPdf'
import { PdfSectionsDialog } from './PdfSectionsDialog'

const ALL_TRACKED: PdfSectionTrackingGate = {
  sleep: true,
  steps: true,
  bodyMeasurements: true,
  bodyComposition: true,
  nightEating: true,
  cycle: true,
  digestion: true,
  alcohol: true,
  water: true,
}

function availability(
  overrides: Partial<PdfSectionAvailability> = {},
): PdfSectionAvailability {
  return { ...EMPTY_PDF_SECTION_AVAILABILITY, ...overrides }
}

/** Scopes the "why disabled" tooltip lookup to the toggle's own wrapper —
 * every other disabled toggle in the dialog renders the same generic
 * aria-label, so an unscoped query would match more than one. */
function tooltipTriggerFor(toggleName: string) {
  const toggle = screen.getByRole('button', { name: toggleName })
  const wrapper = toggle.closest('[data-slot="control-with-info"]')
  if (!(wrapper instanceof HTMLElement)) {
    throw new Error(`no wrapper found for "${toggleName}"`)
  }
  return within(wrapper).getByRole('button', { name: 'Why this is disabled' })
}

function controlWithInfoFor(toggleName: string) {
  const toggle = screen.getByRole('button', { name: toggleName })
  const wrapper = toggle.closest('[data-slot="control-with-info"]')
  if (!(wrapper instanceof HTMLElement)) {
    throw new Error(`no wrapper found for "${toggleName}"`)
  }
  return wrapper
}

// #634 — a disabled toggle can be disabled for one of two reasons (off in
// Settings' "What to track", or on but no data logged in range); the
// tooltip must name the one that actually applies rather than a generic
// "disabled" state.
describe('PdfSectionsDialog', () => {
  it('shows the "not tracked in Settings" reason when data exists but the Settings toggle is off', async () => {
    const user = userEvent.setup()
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability()} // gated off, since tracking is off below
        rawAvailability={availability({ bodyMeasurements: true })}
        trackingGate={{ ...ALL_TRACKED, bodyMeasurements: false }}
        customMetrics={[]}
        dailyLogAvailable
      />,
    )

    expect(screen.getByRole('button', { name: 'Body measurements' })).toBeDisabled()

    await user.click(tooltipTriggerFor('Body measurements'))

    expect(
      await screen.findByText(/not currently tracked/i),
    ).toBeInTheDocument()
  })

  it('shows the "no data in range" reason when the toggle is tracked but has no data', async () => {
    const user = userEvent.setup()
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability()}
        rawAvailability={availability()} // no data anywhere
        trackingGate={ALL_TRACKED}
        customMetrics={[]}
        dailyLogAvailable
      />,
    )

    expect(screen.getByRole('button', { name: 'Body measurements' })).toBeDisabled()

    await user.click(tooltipTriggerFor('Body measurements'))

    expect(
      await screen.findByText(/no data logged for this/i),
    ).toBeInTheDocument()
  })

  it('renders no tooltip next to an enabled toggle', () => {
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability({ weightTrend: true })}
        rawAvailability={availability({ weightTrend: true })}
        trackingGate={ALL_TRACKED}
        customMetrics={[]}
        dailyLogAvailable
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Weight trend' })
    expect(toggle).not.toBeDisabled()
    const wrapper = controlWithInfoFor('Weight trend')
    expect(
      within(wrapper).queryByRole('button', { name: 'Why this is disabled' }),
    ).not.toBeInTheDocument()
  })

  it('keeps short and long section chips in the same tight info-icon row (#943)', () => {
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability()}
        rawAvailability={availability()}
        trackingGate={ALL_TRACKED}
        customMetrics={[{ id: 'm1', name: 'Acne', available: false }]}
        dailyLogAvailable={false}
      />,
    )

    for (const name of ['Alcohol', 'Body measurements', 'Acne', 'Daily log pages']) {
      const row = controlWithInfoFor(name)
      expect(row).toHaveClass('inline-flex', 'w-fit', 'justify-start', 'gap-2')
      expect(row).not.toHaveClass('justify-between')
      expect(tooltipTriggerFor(name)).toHaveClass('size-6')
      expect(tooltipTriggerFor(name)).not.toHaveClass('size-11')
    }
  })

  it('reduces only a tooltip-bearing option’s right padding', () => {
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability({ weightTrend: true })}
        rawAvailability={availability({ weightTrend: true })}
        trackingGate={ALL_TRACKED}
        customMetrics={[]}
        dailyLogAvailable
      />,
    )

    expect(screen.getByRole('button', { name: 'Body measurements' })).toHaveClass('pr-1.5')
    expect(screen.getByRole('button', { name: 'Weight trend' })).toHaveClass('px-3')
    expect(screen.getByRole('button', { name: 'Weight trend' })).not.toHaveClass('pr-1.5')
  })

  it('flags a disabled custom metric as "no data" — custom metrics have no Settings tracking toggle', async () => {
    const user = userEvent.setup()
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        availability={availability()}
        rawAvailability={availability()}
        trackingGate={ALL_TRACKED}
        customMetrics={[{ id: 'm1', name: 'Acne', available: false }]}
        dailyLogAvailable
      />,
    )

    expect(screen.getByRole('button', { name: 'Acne' })).toBeDisabled()

    await user.click(tooltipTriggerFor('Acne'))

    expect(
      await screen.findByText(/no data logged for this/i),
    ).toBeInTheDocument()
  })

  it('leaves Daily log pages off by default (#865)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PdfSectionsDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        submitting={false}
        availability={availability({ weightTrend: true })}
        rawAvailability={availability({ weightTrend: true })}
        trackingGate={ALL_TRACKED}
        customMetrics={[]}
        dailyLogAvailable
      />,
    )

    const dailyLog = screen.getByRole('button', { name: 'Daily log pages' })
    expect(dailyLog).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Generate PDF' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), false)
  })
})
