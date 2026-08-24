/** Dark AutoSleep History tiles: invert + threshold so Tesseract can read H:MM (#758). */
const DARK_MEAN_LUMA = 110
const INVERTED_BLACK_MAX = 90

/** Cap the long edge so one Tesseract pass is not a full-resolution phone screenshot (#761). */
export const OCR_MAX_EDGE = 800

export function meanLuma(rgba: Uint8ClampedArray): number {
  let sum = 0
  const pixels = rgba.length / 4
  if (pixels === 0) return 255
  for (let i = 0; i < rgba.length; i += 4) {
    sum += 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!
  }
  return sum / pixels
}

export function shouldInvertForOcr(rgba: Uint8ClampedArray): boolean {
  return meanLuma(rgba) < DARK_MEAN_LUMA
}

/** In-place: grayscale invert, then black/white at `INVERTED_BLACK_MAX`. */
export function applyDarkScreenshotOcrFilter(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const y = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!
    const v = 255 - y < INVERTED_BLACK_MAX ? 0 : 255
    rgba[i] = v
    rgba[i + 1] = v
    rgba[i + 2] = v
  }
}

export function ocrCanvasSize(
  width: number,
  height: number,
): { width: number; height: number } {
  const edge = Math.max(width, height)
  if (edge <= OCR_MAX_EDGE) return { width, height }
  const scale = OCR_MAX_EDGE / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * One AutoSleep OCR input: downscale, and invert+threshold when the shot is dark.
 * Canvas / bitmap failures return the original so we still OCR once (#761).
 */
export async function prepareAutoSleepScreenshotForOcr(
  image: Blob,
): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return image
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(image)
  } catch {
    return image
  }
  try {
    const { width, height } = ocrCanvasSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return image
    ctx.drawImage(bitmap, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    if (shouldInvertForOcr(imageData.data)) {
      applyDarkScreenshotOcrFilter(imageData.data)
      ctx.putImageData(imageData, 0, 0)
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), 'image/png')
    })
    return blob ?? image
  } catch {
    return image
  } finally {
    bitmap.close()
  }
}
