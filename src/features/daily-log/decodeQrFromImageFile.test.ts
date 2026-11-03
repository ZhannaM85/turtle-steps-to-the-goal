import { afterEach, describe, expect, it, vi } from 'vitest'
import { DecodeHintType } from '@zxing/library'
import { decodeQrFromImageFile } from './decodeQrFromImageFile'

const decodeFromImageUrl = vi.fn()
const decodeFromCanvas = vi.fn()
let capturedHints: Map<unknown, unknown> | undefined

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    constructor(hints?: Map<unknown, unknown>) {
      capturedHints = hints
    }
    decodeFromImageUrl = decodeFromImageUrl
    decodeFromCanvas = decodeFromCanvas
  },
}))

describe('decodeQrFromImageFile (#723 / #1117)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    capturedHints = undefined
    vi.stubGlobal('createImageBitmap', undefined)
  })

  it('returns trimmed QR text from a still image', async () => {
    decodeFromImageUrl.mockResolvedValue({
      getText: () => ' https://example.com/?shareFood=abc ',
    })
    const file = new File(['png'], 'qr.png', { type: 'image/png' })
    await expect(decodeQrFromImageFile(file)).resolves.toBe(
      'https://example.com/?shareFood=abc',
    )
    expect(capturedHints?.get(DecodeHintType.TRY_HARDER)).toBe(true)
  })

  it('throws when the image has no readable QR', async () => {
    decodeFromImageUrl.mockRejectedValue(new Error('NotFoundException'))
    const file = new File(['png'], 'blank.png', { type: 'image/png' })
    await expect(decodeQrFromImageFile(file)).rejects.toThrow()
  })

  it('downscales via canvas with TRY_HARDER when createImageBitmap exists (#1117)', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 4000,
        height: 3000,
        close,
      })),
    )
    const drawImage = vi.fn()
    const getContext = vi.fn(() => ({ drawImage }))
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext,
        } as unknown as HTMLCanvasElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    }) as typeof document.createElement)

    decodeFromCanvas.mockReturnValue({
      getText: () => 'https://example.com/?shareFood=smoothie',
    })

    const file = new File(['png'], 'big.png', { type: 'image/png' })
    await expect(decodeQrFromImageFile(file)).resolves.toBe(
      'https://example.com/?shareFood=smoothie',
    )
    expect(decodeFromCanvas).toHaveBeenCalled()
    expect(capturedHints?.get(DecodeHintType.TRY_HARDER)).toBe(true)
    expect(close).toHaveBeenCalled()
  })
})
