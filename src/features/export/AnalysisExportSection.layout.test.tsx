import 'fake-indexeddb/auto'
import { render as rtlRender, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AnalysisExportSection } from './AnalysisExportSection'

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter })
}

describe('AnalysisExportSection layout', () => {
  it('keeps the CSV info icon in a tight fixed-gap row (#943)', () => {
    render(<AnalysisExportSection />)

    const csv = screen.getByRole('button', { name: 'Export as CSV' })
    const row = csv.closest('[data-slot="control-with-info"]')
    expect(row).toHaveClass('inline-flex', 'w-fit', 'justify-start', 'gap-2')
    expect(row).not.toHaveClass('justify-between')
    const info = screen.getByRole('button', { name: 'Why CSV for AI analysis' })
    expect(row).toContainElement(info)
    expect(info).toHaveClass('size-6')
    expect(info).not.toHaveClass('size-11')
  })

  it('uses the shared period segmented-control chrome (#951)', () => {
    render(<AnalysisExportSection />)

    const period = screen.getByRole('radiogroup', { name: 'Export period' })
    expect(period).toHaveClass('flex', 'flex-wrap', 'justify-start')
    expect(period).toHaveClass('rounded-lg', 'bg-muted', 'p-1')
    const week = within(period).getByRole('radio', { name: 'Week' })
    expect(week).toHaveClass('h-12', 'rounded-md', 'text-sm', 'font-medium')
    expect(week.className).toContain('data-[state=on]:bg-card')
    expect(week.className).toContain('data-[state=on]:shadow-sm')
  })

  it('shows the temporary PDF layout debug toggle in the PDF export area (#952)', () => {
    render(<AnalysisExportSection />)

    expect(
      screen.getByRole('radiogroup', { name: 'Temporary PDF layout debug' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Shows a yellow overlay and outlines when you export a PDF, so layout numbers can be checked on this device. Turn this off when you are done.',
      ),
    ).toBeInTheDocument()
  })
})
