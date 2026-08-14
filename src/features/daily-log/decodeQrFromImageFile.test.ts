import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeQrFromImageFile } from './decodeQrFromImageFile'

const decodeFromImageUrl = vi.fn()

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromImageUrl = decodeFromImageUrl
  },
}))

describe('decodeQrFromImageFile (#723)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns trimmed QR text from a still image', async () => {
    decodeFromImageUrl.mockResolvedValue({
      getText: () => ' https://example.com/?shareDay=abc ',
    })
    const file = new File(['png'], 'qr.png', { type: 'image/png' })
    await expect(decodeQrFromImageFile(file)).resolves.toBe(
      'https://example.com/?shareDay=abc',
    )
  })

  it('throws when the image has no readable QR', async () => {
    decodeFromImageUrl.mockRejectedValue(new Error('NotFoundException'))
    const file = new File(['png'], 'blank.png', { type: 'image/png' })
    await expect(decodeQrFromImageFile(file)).rejects.toThrow()
  })
})
