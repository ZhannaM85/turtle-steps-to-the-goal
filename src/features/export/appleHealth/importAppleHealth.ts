import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  filterPatchesToFields,
  mergeDailyEntryPatches,
  type DailyEntryImportMode,
  type DailyEntryPatch,
} from '../mergeDailyEntryPatches'
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

const XML_ENTRY_RE = /\.xml$/i
const EXPORT_CDA_RE = /(^|\/)export_cda\.xml$/i

function pickAppleHealthXmlEntry<
  T extends {
    filename: string
    directory?: boolean
    uncompressedSize?: number
  },
>(entries: T[]): T | undefined {
  return entries
    .filter(
      (entry) =>
        !entry.directory &&
        XML_ENTRY_RE.test(entry.filename) &&
        !EXPORT_CDA_RE.test(entry.filename),
    )
    .sort(
      (a, b) => (b.uncompressedSize ?? 0) - (a.uncompressedSize ?? 0),
    )[0]
}

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
  /** #369 — when provided, only these `DailyEntryPatch` fields are applied;
   * omitted entirely (not just an empty set) means "import everything",
   * preserving pre-#369 behavior for any caller that doesn't pass it. */
  includedFields?: ReadonlySet<keyof DailyEntryPatch>,
  /** #496 — defaults to fillGaps inside mergeDailyEntryPatches. */
  importMode?: DailyEntryImportMode,
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

    const xmlEntry = pickAppleHealthXmlEntry(entries)
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

    const rawPatches = builder.build()
    const patches = includedFields
      ? filterPatchesToFields(rawPatches, includedFields)
      : rawPatches
    const existingEntries = await dailyEntryRepository.getAll()
    const { daysImported, daysUpdated, entriesToUpsert } =
      mergeDailyEntryPatches(patches, existingEntries, importMode)

    await Promise.all(
      entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
    )

    return { daysImported, daysUpdated }
  } finally {
    await reader.close()
  }
}
