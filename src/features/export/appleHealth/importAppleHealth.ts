import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { mergeDailyEntryPatches } from '../mergeDailyEntryPatches'
import {
  AppleHealthPatchBuilder,
  AppleHealthRecordScanner,
} from './appleHealthParser'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export class AppleHealthInvalidFileError extends Error {}

export interface AppleHealthImportSummary {
  daysImported: number
  daysUpdated: number
}

const EXPORT_XML_RE = /(^|\/)export\.xml$/i

/**
 * Decrypts nothing (Apple Health's export.zip is, unlike Zepp Life's, never
 * password-protected) but does need to *stream* — a real `export.xml` can
 * be 1GB+ uncompressed, so this never materializes the full decompressed
 * text as one string. `@zip.js/zip.js` (already a dependency for #365)
 * supports handing `entry.getData()` a raw `WritableStream` instead of one
 * of its buffering `Writer` helpers — each `write()` call here gets one
 * chunk of decompressed bytes, decoded and fed straight into
 * `AppleHealthRecordScanner`/`AppleHealthPatchBuilder`, which themselves
 * only ever keep "since the last complete tag" and "one accumulator per
 * calendar date" in memory, not the whole file.
 */
export async function importAppleHealthExport(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<AppleHealthImportSummary> {
  const { ZipReader, BlobReader } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))

  try {
    let entries
    try {
      entries = await reader.getEntries()
    } catch {
      throw new AppleHealthInvalidFileError(
        "This doesn't look like an Apple Health export file.",
      )
    }

    const xmlEntry = entries.find((entry) => EXPORT_XML_RE.test(entry.filename))
    if (!xmlEntry || xmlEntry.directory) {
      throw new AppleHealthInvalidFileError(
        "This doesn't look like an Apple Health export file.",
      )
    }

    const scanner = new AppleHealthRecordScanner()
    const builder = new AppleHealthPatchBuilder()
    const decoder = new TextDecoder('utf-8')

    // A `TransformStream` rather than a bare `WritableStream` sink — zip.js
    // hands its own writable side to the internal decompressor and closes
    // it once done; consuming from the readable side with a normal reader
    // loop here avoids implementing a custom sink whose lifecycle has to
    // exactly match whatever zip.js expects to drive directly.
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const getDataPromise = xmlEntry.getData(writable, {
      onprogress: (index: number, max: number) => {
        if (max > 0) onProgress?.(index / max)
      },
    })

    const streamReader = readable.getReader()
    for (;;) {
      const { done, value } = await streamReader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      for (const record of scanner.push(text)) {
        builder.addRecord(record)
      }
    }
    const finalText = decoder.decode()
    for (const record of scanner.push(finalText)) {
      builder.addRecord(record)
    }
    await getDataPromise

    const patches = builder.build()
    const existingEntries = await dailyEntryRepository.getAll()
    const { daysImported, daysUpdated, entriesToUpsert } =
      mergeDailyEntryPatches(patches, existingEntries)

    await Promise.all(
      entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
    )

    return { daysImported, daysUpdated }
  } finally {
    await reader.close()
  }
}
