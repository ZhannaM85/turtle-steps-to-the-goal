import 'fake-indexeddb/auto'
import { render as rtlRender, screen } from '@testing-library/react'
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
})
