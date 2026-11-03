import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
} from '@zxing/library'
import { generateQrDataUrl } from './generateQrDataUrl'

const encode = vi.fn()
let capturedHints: Map<unknown, unknown> | undefined

vi.mock('@zxing/library', async () => {
  const actual = await vi.importActual<typeof import('@zxing/library')>(
    '@zxing/library',
  )
  return {
    ...actual,
    QRCodeWriter: class {
      encode = (...args: unknown[]) => {
        capturedHints = args[4] as Map<unknown, unknown>
        return encode(...args)
      }
    },
  }
})

describe('generateQrDataUrl (#661 / #1117)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    capturedHints = undefined
  })

  it('encodes with a quiet zone and medium error correction for phone-screen scans', async () => {
    encode.mockReturnValue({
      getWidth: () => 2,
      getHeight: () => 2,
      get: () => false,
    })
    const fillRect = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect,
          }),
          toDataURL: () => 'data:image/png;base64,qq',
        } as unknown as HTMLCanvasElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    }) as typeof document.createElement)

    await expect(generateQrDataUrl('https://example.com/?shareFood=x')).resolves.toBe(
      'data:image/png;base64,qq',
    )
    expect(capturedHints?.get(EncodeHintType.MARGIN)).toBe(2)
    expect(capturedHints?.get(EncodeHintType.ERROR_CORRECTION)).toBe(
      QRCodeDecoderErrorCorrectionLevel.M,
    )
    expect(encode.mock.calls[0]?.[2]).toBe(320)
  })
})
