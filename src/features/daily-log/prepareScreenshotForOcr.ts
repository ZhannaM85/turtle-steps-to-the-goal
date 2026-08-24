/** Dark AutoSleep History tiles: invert + threshold so Tesseract can read H:MM (#758). */
const DARK_MEAN_LUMA = 110
const INVERTED_BLACK_MAX = 90

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

export async function enhanceDarkScreenshotForOcr(
  image: Blob,
): Promise<Blob | undefined> {
  if (typeof createImageBitmap !== 'function') return undefined
  const bitmap = await createImageBitmap(image)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    if (!shouldInvertForOcr(imageData.data)) return undefined
    applyDarkScreenshotOcrFilter(imageData.data)
    ctx.putImageData(imageData, 0, 0)
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/png')
    })
  } finally {
    bitmap.close()
  }
}
