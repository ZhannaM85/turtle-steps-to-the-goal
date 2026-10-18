/**
 * #961 — on web/PWA, open the browser's PDF viewer before Share/Save (do not
 * pass a `blob:` URL to Web Share — messengers treat it as text).
 * #1101 — on Capacitor, use the system share/save sheet instead (WKWebView
 * has no Safari download/preview sheet for `<a download>`).
 */
import { Capacitor } from '@capacitor/core'
import { downloadOrShareFile } from './downloadOrShareFile'

const REVOKE_BLOB_URL_MS = 60_000

export async function openPdfPreview(
  blob: Blob,
  fileName = 'turtle-steps-summary.pdf',
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await downloadOrShareFile(blob, fileName)
    return
  }
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.click()
  // iOS Safari opens the blob in a viewer; revoking immediately blanks it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_BLOB_URL_MS)
}
