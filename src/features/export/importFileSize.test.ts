import { describe, expect, it } from 'vitest'
import {
  assertImportFileWithinSizeLimit,
  ImportFileTooLargeError,
  MAX_IMPORT_FILE_BYTES,
} from './importFileSize'

function fileWithSize(size: number): File {
  const file = new File(['x'], 'import.bin')
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('assertImportFileWithinSizeLimit (#703)', () => {
  it('allows a file at the limit', () => {
    expect(() =>
      assertImportFileWithinSizeLimit(fileWithSize(MAX_IMPORT_FILE_BYTES)),
    ).not.toThrow()
  })

  it('rejects a file over the limit', () => {
    expect(() =>
      assertImportFileWithinSizeLimit(fileWithSize(MAX_IMPORT_FILE_BYTES + 1)),
    ).toThrow(ImportFileTooLargeError)
  })
})
