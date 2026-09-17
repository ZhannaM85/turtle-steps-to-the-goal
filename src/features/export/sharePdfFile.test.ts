import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canSharePdfFile,
  pdfFileFromBlob,
  shareOrDownloadPdf,
} from './sharePdfFile'

const FILENAME = 'turtle-steps-daily-log-2026-09-17.pdf'

function pdfBlob(): Blob {
  return new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })
}

function stubShareApi(options: {
  canShare?: boolean | ((data: ShareData) => boolean)
  share?: (data: ShareData) => Promise<void>
}): { share: ReturnType<typeof vi.fn>; canShare: ReturnType<typeof vi.fn> } {
  const share = vi.fn(options.share ?? (async () => {}))
  const canShare = vi.fn((data: ShareData) => {
    if (typeof options.canShare === 'function') return options.canShare(data)
    return options.canShare ?? false
  })
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
    writable: true,
  })
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: canShare,
    writable: true,
  })
  return { share, canShare }
}

function stubMissingShareApi(): void {
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: undefined,
    writable: true,
  })
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: undefined,
    writable: true,
  })
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

function expectSharePayloadIsPdfFile(data: ShareData): void {
  expect(data.url).toBeUndefined()
  expect(data).not.toHaveProperty('url')
  expect(data.files).toHaveLength(1)
  const file = data.files![0]
  expect(file).toBeInstanceOf(File)
  expect(file.name).toBe(FILENAME)
  expect(file.name.endsWith('.pdf')).toBe(true)
  expect(file.type).toBe('application/pdf')
}

describe('sharePdfFile (#956)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    stubMissingShareApi()
  })

  it('builds a File with application/pdf and a .pdf name', () => {
    const file = pdfFileFromBlob(pdfBlob(), FILENAME)
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe(FILENAME)
    expect(file.type).toBe('application/pdf')
  })

  it('shares via files when canShare({ files }) is true, never url: blob', async () => {
    const { share, canShare } = stubShareApi({ canShare: true })
    const { createObjectURL, click } = stubDownload()

    const outcome = await shareOrDownloadPdf(pdfBlob(), FILENAME)

    expect(outcome).toBe('shared')
    expect(canShare).toHaveBeenCalledTimes(1)
    expectSharePayloadIsPdfFile(canShare.mock.calls[0]![0] as ShareData)
    expect(share).toHaveBeenCalledTimes(1)
    expectSharePayloadIsPdfFile(share.mock.calls[0]![0] as ShareData)
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads when canShare files is false and does not call share', async () => {
    const { share } = stubShareApi({ canShare: false })
    const { createObjectURL, click } = stubDownload()

    const outcome = await shareOrDownloadPdf(pdfBlob(), FILENAME)

    expect(outcome).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const passed = createObjectURL.mock.calls[0]![0] as Blob
    expect(passed).toBeInstanceOf(File)
    expect((passed as File).name).toBe(FILENAME)
    expect(passed.type).toBe('application/pdf')
    expect(click).toHaveBeenCalled()
  })

  it('downloads when Web Share is missing', async () => {
    stubMissingShareApi()
    const { createObjectURL, click } = stubDownload()

    const outcome = await shareOrDownloadPdf(pdfBlob(), FILENAME)

    expect(outcome).toBe('downloaded')
    expect(canSharePdfFile(pdfFileFromBlob(pdfBlob(), FILENAME))).toBe(false)
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
  })

  it('treats a cancelled share sheet as cancelled, not a download', async () => {
    stubShareApi({
      canShare: true,
      share: async () => {
        throw new DOMException('Share canceled', 'AbortError')
      },
    })
    const { createObjectURL, click } = stubDownload()

    const outcome = await shareOrDownloadPdf(pdfBlob(), FILENAME)

    expect(outcome).toBe('cancelled')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  it('falls back to download when share throws a non-abort error', async () => {
    stubShareApi({
      canShare: true,
      share: async () => {
        throw new DOMException('Not allowed', 'NotAllowedError')
      },
    })
    const { click } = stubDownload()

    const outcome = await shareOrDownloadPdf(pdfBlob(), FILENAME)

    expect(outcome).toBe('downloaded')
    expect(click).toHaveBeenCalled()
  })

  it('never passes a blob: URL string to canShare or share', async () => {
    const { share, canShare } = stubShareApi({ canShare: true })

    await shareOrDownloadPdf(pdfBlob(), FILENAME)

    for (const data of [
      canShare.mock.calls[0]![0] as ShareData,
      share.mock.calls[0]![0] as ShareData,
    ]) {
      expect(typeof data.url).not.toBe('string')
      expect(data.url).toBeUndefined()
      const serialized = JSON.stringify(data, ['url', 'text', 'title'])
      expect(serialized).not.toContain('blob:')
      expect(serialized).not.toContain('blob:https://')
    }
  })
})
