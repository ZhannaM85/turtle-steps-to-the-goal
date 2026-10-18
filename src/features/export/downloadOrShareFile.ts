/**
 * #1101 — web/PWA keeps `<a download>`; Capacitor WKWebView/Android WebView
 * does not surface a save-location UI for that path, so native writes the
 * blob to Cache and opens the system share sheet (Save to Files, etc.).
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export class ShareCancelledError extends Error {
  constructor() {
    super('Share cancelled')
    this.name = 'ShareCancelledError'
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not encode file for sharing.'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

function isShareCancelError(err: unknown): boolean {
  if (err instanceof ShareCancelledError) return true
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : String(err ?? '')
  return /cancel/i.test(message)
}

function downloadInBrowser(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

async function shareViaNativeSheet(blob: Blob, fileName: string): Promise<void> {
  const data = await blobToBase64(blob)
  const path = `exports/${fileName}`
  const written = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    recursive: true,
  })
  try {
    await Share.share({
      title: fileName,
      files: [written.uri],
      dialogTitle: fileName,
    })
  } catch (err) {
    if (isShareCancelError(err)) {
      throw new ShareCancelledError()
    }
    throw err
  }
}

/** Download (web) or open the native share/save sheet. */
export async function downloadOrShareFile(
  blob: Blob,
  fileName: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareViaNativeSheet(blob, fileName)
    return
  }
  downloadInBrowser(blob, fileName)
}
