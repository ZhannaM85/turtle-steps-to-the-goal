/**
 * #956 — give messengers a real PDF File, never a `blob:` URL string.
 *
 * Telegram (and others) treat `navigator.share({ url: blobUrl })` as a
 * text message. Share `{ files: [pdfFile] }` after `canShare({ files })`;
 * if the files API is missing or rejects, fall back to a download click.
 */

export type SharePdfOutcome = 'shared' | 'downloaded' | 'cancelled'

const PDF_TYPE = 'application/pdf'
const REVOKE_BLOB_URL_MS = 60_000

export function pdfFileFromBlob(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: PDF_TYPE })
}

export function canSharePdfFile(file: File): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function downloadPdf(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  // iOS Safari opens the blob in a viewer; revoking immediately blanks it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_BLOB_URL_MS)
}

export async function shareOrDownloadPdf(
  blob: Blob,
  filename: string,
): Promise<SharePdfOutcome> {
  const file = pdfFileFromBlob(blob, filename)
  if (canSharePdfFile(file)) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (isAbortError(err)) return 'cancelled'
    }
  }
  downloadPdf(file, filename)
  return 'downloaded'
}
