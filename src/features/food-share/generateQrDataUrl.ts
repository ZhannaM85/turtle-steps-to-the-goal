/**
 * #661 / #1117 — render a QR code as a PNG data URL via `@zxing/library`'s
 * QRCodeWriter (already a dependency for barcode scanning). Lazy-imported
 * so Settings doesn't pay for the encoder until Share is opened.
 *
 * #1117: wider quiet zone + medium error correction so a photo of another
 * phone's share sheet is likelier to decode (screen glare / soft focus).
 */
export async function generateQrDataUrl(
  text: string,
  sizePx = 320,
): Promise<string> {
  const {
    QRCodeWriter,
    BarcodeFormat,
    EncodeHintType,
    QRCodeDecoderErrorCorrectionLevel,
  } = await import('@zxing/library')
  const hints = new Map()
  hints.set(EncodeHintType.MARGIN, 2)
  hints.set(EncodeHintType.CHARACTER_SET, 'UTF-8')
  hints.set(
    EncodeHintType.ERROR_CORRECTION,
    QRCodeDecoderErrorCorrectionLevel.M,
  )
  const writer = new QRCodeWriter()
  const matrix = writer.encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)

  const canvas = document.createElement('canvas')
  canvas.width = sizePx
  canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, sizePx, sizePx)
  ctx.fillStyle = '#000000'
  for (let y = 0; y < matrix.getHeight(); y++) {
    for (let x = 0; x < matrix.getWidth(); x++) {
      if (matrix.get(x, y)) ctx.fillRect(x, y, 1, 1)
    }
  }
  return canvas.toDataURL('image/png')
}
