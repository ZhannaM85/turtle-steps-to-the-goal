/**
 * #1101 / #1102 — web/PWA keeps `<a download>`; Capacitor WKWebView does not
 * surface a save-location UI for that path, so native writes to Cache and
 * opens the system share sheet.
 *
 * #1102: text/JSON must use UTF-8 write (large backups fail as base64 on
 * device). Binary (xlsx/pdf) stays base64. Share uses `url` from
 * `Filesystem.getUri` (more reliable on iOS than `files` alone).
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
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

function isTextExport(blob: Blob, fileName: string): boolean {
  if (
    blob.type.startsWith('text/') ||
    blob.type === 'application/json' ||
    blob.type === 'application/csv'
  ) {
    return true
  }
  return /\.(json|md|csv|txt)$/i.test(fileName)
}

function downloadInBrowser(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

async function writeNativeShareFile(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const path = `exports/${fileName}`
  if (isTextExport(blob, fileName)) {
    await Filesystem.writeFile({
      path,
      data: await blob.text(),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    })
  } else {
    await Filesystem.writeFile({
      path,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    })
  }
  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  })
  return uri
}

async function shareViaNativeSheet(blob: Blob, fileName: string): Promise<void> {
  const uri = await writeNativeShareFile(blob, fileName)
  try {
    await Share.share({
      title: fileName,
      url: uri,
      dialogTitle: fileName,
    })
  } catch (err) {
    if (isShareCancelError(err)) {
      throw new ShareCancelledError()
    }
    try {
      await Share.share({
        title: fileName,
        files: [uri],
        dialogTitle: fileName,
      })
    } catch (err2) {
      if (isShareCancelError(err2)) {
        throw new ShareCancelledError()
      }
      throw err2
    }
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
