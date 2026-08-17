/**
 * #742 / #748 — on-device OCR for a screenshot. Worker/core/lang files are
 * same-origin (`public/tesseract/`); this must not fall back to a CDN
 * (`connect-src` is `'self'` only besides food APIs).
 */
export async function recognizeOnDeviceScreenshot(
  image: Blob,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const base = import.meta.env.BASE_URL
  const worker = await createWorker('eng', 1, {
    workerPath: `${base}tesseract/worker.min.js`,
    corePath: `${base}tesseract/core`,
    langPath: `${base}tesseract/tessdata`,
    gzip: false,
  })
  try {
    const { data } = await worker.recognize(image)
    return data.text ?? ''
  } finally {
    await worker.terminate()
  }
}
