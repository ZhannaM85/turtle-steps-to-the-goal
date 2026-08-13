/**
 * #703 — reject oversized imports *before* JSON.parse / zip / exceljs.
 * 200 MiB still fits a multi-year JSON backup and a typical Apple Health
 * export; it is not a zip-bomb-proof ceiling, just a tab-freeze guard.
 */
export const MAX_IMPORT_FILE_BYTES = 200 * 1024 * 1024

export class ImportFileTooLargeError extends Error {
  readonly name = 'ImportFileTooLargeError'
  constructor() {
    super('import file exceeds size limit')
  }
}

export function assertImportFileWithinSizeLimit(file: File): void {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ImportFileTooLargeError()
  }
}
