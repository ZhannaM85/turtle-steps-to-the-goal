/** Dark AutoSleep screens: invert so light text becomes dark for Tesseract (#758). */
const DARK_MEAN_LUMA = 110

/**
 * Cap the long edge so one Tesseract pass is not a full-resolution phone
 * screenshot (#761). 800px plus a hard B/W threshold wiped Sleep Rating
 * z-icon `0h 45m` (`SLEEP BANK @0h45m` → `O0h asm`). 1600 keeps that
 * short duration readable without a second OCR pass (#771).
 */
export const OCR_MAX_EDGE = 1600

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

/**
 * In-place grayscale invert. Do not hard-threshold: mid-gray z-icon
 * `0h 45m` becomes white and disappears (#771).
 */
export function applyDarkScreenshotOcrFilter(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const y = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!
    const v = Math.round(255 - y)
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

/** Zepp goals rows are light-on-light; upscale small phone photos so a thin `1` in `14` is readable (#773). */
export function ocrCanvasSizeAtLeast(
  width: number,
  height: number,
  minEdge = OCR_MAX_EDGE,
): { width: number; height: number } {
  const edge = Math.max(width, height)
  if (edge >= minEdge) return { width, height }
  const scale = minEdge / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * One AutoSleep OCR input: downscale, and invert when the shot is dark.
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

/**
 * Upscale a small Zepp screenshot for Tesseract. Do not invert (light UI)
 * and do not downscale a large shot (thin digits such as the `1` in `14`).
 */
export async function prepareZeppScreenshotForOcr(
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
    const { width, height } = ocrCanvasSizeAtLeast(bitmap.width, bitmap.height)
    if (width === bitmap.width && height === bitmap.height) return image
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return image
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
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
