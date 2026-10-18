/**
 * #1101 / #1102 — web/PWA keeps `<a download>`; Capacitor needs a real share
 * sheet. Large JSON backups must not cross the bridge as one base64 blob.
 *
 * Order on native:
 * 1) Web Share API with a `File` (no Filesystem bridge payload)
 * 2) Chunked UTF-8 write to Cache + `@capacitor/share` `files: [uri]`
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** Keep bridge messages small on device (#1102). */
const TEXT_CHUNK_CHARS = 256 * 1024

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

async function shareViaWebShareApi(
  blob: Blob,
  fileName: string,
): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false
  const file = new File([blob], fileName, {
    type: blob.type || 'application/octet-stream',
  })
  const payload = { files: [file] as File[] }
  if (
    typeof navigator.canShare === 'function' &&
    !navigator.canShare(payload)
  ) {
    return false
  }
  try {
    await navigator.share(payload)
    return true
  } catch (err) {
    if (isShareCancelError(err)) {
      throw new ShareCancelledError()
    }
    return false
  }
}

async function writeTextChunked(path: string, text: string): Promise<void> {
  await Filesystem.writeFile({
    path,
    data: text.slice(0, TEXT_CHUNK_CHARS),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  for (let i = TEXT_CHUNK_CHARS; i < text.length; i += TEXT_CHUNK_CHARS) {
    await Filesystem.appendFile({
      path,
      data: text.slice(i, i + TEXT_CHUNK_CHARS),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
  }
}

async function writeNativeShareFile(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const path = `exports/${fileName}`
  if (isTextExport(blob, fileName)) {
    await writeTextChunked(path, await blob.text())
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

async function shareViaCapacitorShare(
  blob: Blob,
  fileName: string,
): Promise<void> {
  const uri = await writeNativeShareFile(blob, fileName)
  try {
    // Prefer `files` for local paths (iOS UIActivity file item).
    await Share.share({
      title: fileName,
      files: [uri],
      dialogTitle: fileName,
    })
  } catch (err) {
    if (isShareCancelError(err)) {
      throw new ShareCancelledError()
    }
    try {
      await Share.share({
        title: fileName,
        url: uri,
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

async function shareViaNativeSheet(blob: Blob, fileName: string): Promise<void> {
  if (await shareViaWebShareApi(blob, fileName)) return
  try {
    await shareViaCapacitorShare(blob, fileName)
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
