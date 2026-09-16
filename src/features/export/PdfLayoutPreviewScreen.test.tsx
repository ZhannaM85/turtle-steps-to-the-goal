import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PdfLayoutPreviewScreen } from './PdfLayoutPreviewScreen'

describe('PdfLayoutPreviewScreen (#935)', () => {
  it('shows html2canvas page images instead of an HTML iframe', async () => {
    render(
      <MemoryRouter>
        <PdfLayoutPreviewScreen />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'PDF layout' }),
    ).toBeInTheDocument()
    const page = await screen.findByRole('img', { name: 'Page 1' })
    expect(page.tagName).toBe('IMG')
    expect(page.getAttribute('src')).toMatch(/^data:image\//)
    expect(screen.queryByTitle('PDF layout')).not.toBeInTheDocument()
  })
})
