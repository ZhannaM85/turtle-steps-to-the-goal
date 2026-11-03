/**
 * #723 / #1117 — decode a QR from a still photo (same-phone fallback when the
 * live camera is awkward). QR-only, same hint as `scanKind="qr"`.
 *
 * #1117: iPhone library photos are often multi-megapixel; ZXing's
 * `decodeFromImageUrl` on the full frame frequently fails on a phone-screen
 * QR. Downscale to a few max edges, decode via canvas with `TRY_HARDER`
 * (parity with the live camera path in #777).
 */

/** Longest edge tried first → last (full-res phone shots → softer crops). */
const DECODE_MAX_EDGES_PX = [1600, 1000, 700] as const

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read image'))
    }
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

function drawScaledToCanvas(
  source: ImageBitmap | HTMLImageElement,
  maxEdgePx: number,
): HTMLCanvasElement {
  const srcW =
    'naturalWidth' in source && source.naturalWidth > 0
      ? source.naturalWidth
      : source.width
  const srcH =
    'naturalHeight' in source && source.naturalHeight > 0
      ? source.naturalHeight
      : source.height
  const longest = Math.max(srcW, srcH)
  const scale = longest > maxEdgePx ? maxEdgePx / longest : 1
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function createQrReader(
  BrowserMultiFormatReader: typeof import('@zxing/browser').BrowserMultiFormatReader,
  DecodeHintType: typeof import('@zxing/library').DecodeHintType,
  BarcodeFormat: typeof import('@zxing/library').BarcodeFormat,
) {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints)
}

export async function decodeQrFromImageFile(file: File): Promise<string> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')])
  const reader = createQrReader(
    BrowserMultiFormatReader,
    DecodeHintType,
    BarcodeFormat,
  )

  async function decodeFromDataUrl(): Promise<string> {
    const dataUrl = await fileToDataUrl(file)
    const text = (await reader.decodeFromImageUrl(dataUrl)).getText().trim()
    if (!text) throw new Error('Empty QR')
    return text
  }

  if (typeof createImageBitmap !== 'function') {
    return decodeFromDataUrl()
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return decodeFromDataUrl()
  }

  try {
    let lastError: unknown
    for (const maxEdge of DECODE_MAX_EDGES_PX) {
      try {
        const canvas = drawScaledToCanvas(bitmap, maxEdge)
        const text = reader.decodeFromCanvas(canvas).getText().trim()
        if (text) return text
      } catch (err) {
        lastError = err
      }
    }
    try {
      return await decodeFromDataUrl()
    } catch (dataUrlError) {
      if (lastError instanceof Error) throw lastError
      throw new Error('Could not decode QR from photo', { cause: dataUrlError })
    }
  } finally {
    bitmap.close()
  }
}
