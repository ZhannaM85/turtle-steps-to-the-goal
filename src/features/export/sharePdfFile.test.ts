import { afterEach, describe, expect, it, vi } from 'vitest'
import { openPdfPreview } from './sharePdfFile'

function pdfBlob(): Blob {
  return new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })
}

function stubDownload(): {
  createObjectURL: ReturnType<typeof vi.fn>
  click: ReturnType<typeof vi.spyOn>
} {
  const createObjectURL = vi.fn(() => 'blob:https://zhannam85.github.io/mock')
  URL.createObjectURL = createObjectURL
  URL.revokeObjectURL = vi.fn()
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})
  return { createObjectURL, click }
}

describe('sharePdfFile (#961)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the PDF in the browser viewer before the user chooses Share or Save', () => {
    const { createObjectURL, click } = stubDownload()
    const anchor = document.createElement('a')
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    openPdfPreview(pdfBlob())

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchor.href).toBe('blob:https://zhannam85.github.io/mock')
    expect(anchor.download).toBe('')
    expect(click).toHaveBeenCalled()
    expect(createElement).toHaveBeenCalledWith('a')
  })

  it('keeps the preview URL alive long enough for the iOS viewer', () => {
    vi.useFakeTimers()
    stubDownload()

    openPdfPreview(pdfBlob())
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:https://zhannam85.github.io/mock',
    )
    vi.useRealTimers()
  })
})
