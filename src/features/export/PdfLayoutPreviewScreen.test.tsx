import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PdfLayoutPreviewScreen } from './PdfLayoutPreviewScreen'

describe('PdfLayoutPreviewScreen (#933)', () => {
  it('renders the isolated HTML document used by the PDF pipeline', async () => {
    render(
      <MemoryRouter>
        <PdfLayoutPreviewScreen />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'PDF layout' }),
    ).toBeInTheDocument()
    const frame = await screen.findByTitle('PDF layout')
    expect(frame.tagName).toBe('IFRAME')
    await waitFor(() => {
      expect(frame.getAttribute('srcdoc')).toContain('class="pdf-root"')
    })
    expect(frame.getAttribute('srcdoc')).toContain('pdf-footer')
  })
})
