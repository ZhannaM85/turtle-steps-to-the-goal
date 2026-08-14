/**
 * #723 — decode a QR from a still photo (same-phone fallback when the
 * live camera is awkward). QR-only, same hint as `scanKind="qr"`.
 */
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

export async function decodeQrFromImageFile(file: File): Promise<string> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')])
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
  const reader = new BrowserMultiFormatReader(hints)
  const dataUrl = await fileToDataUrl(file)
  const result = await reader.decodeFromImageUrl(dataUrl)
  const text = result.getText().trim()
  if (!text) throw new Error('Empty QR')
  return text
}
