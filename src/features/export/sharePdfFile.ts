/**
 * #961 — open the browser's PDF viewer before the user chooses Share or
 * Save. In particular, do not pass a `blob:` URL to Web Share: messengers
 * interpret that as text instead of the PDF. The native viewer receives the
 * document itself and exposes its own file-aware Share/Save controls.
 */

const REVOKE_BLOB_URL_MS = 60_000

export function openPdfPreview(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.click()
  // iOS Safari opens the blob in a viewer; revoking immediately blanks it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_BLOB_URL_MS)
}
