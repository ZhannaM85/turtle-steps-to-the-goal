import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadOrShareFile,
  ShareCancelledError,
} from './downloadOrShareFile'

const isNativePlatform = vi.fn(() => false)
const writeFile = vi.fn()
const getUri = vi.fn()
const share = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: (...args: unknown[]) => writeFile(...args),
    getUri: (...args: unknown[]) => getUri(...args),
  },
}))

vi.mock('@capacitor/share', () => ({
  Share: {
    share: (...args: unknown[]) => share(...args),
  },
}))

describe('downloadOrShareFile (#1101 / #1102)', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false)
    writeFile.mockReset()
    getUri.mockReset()
    share.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('uses <a download> on web/PWA', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const blob = new Blob(['{"ok":true}'], { type: 'application/json' })

    await downloadOrShareFile(blob, 'turtle-steps-backup-2026-10-18.json')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
    expect(share).not.toHaveBeenCalled()
  })

  it('writes JSON as UTF-8 Cache file and Share.share({ url }) on native (#1102)', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share.mockResolvedValue({
      activityType: 'com.apple.DocumentManagerUICore.SaveToFiles',
    })
    const blob = new Blob(['{"ok":true}'], { type: 'application/json' })

    await downloadOrShareFile(blob, 'backup.json')

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'exports/backup.json',
        data: '{"ok":true}',
        directory: 'CACHE',
        encoding: 'utf8',
        recursive: true,
      }),
    )
    expect(getUri).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'exports/backup.json',
        directory: 'CACHE',
      }),
    )
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///cache/exports/backup.json',
        title: 'backup.json',
      }),
    )
  })

  it('writes binary exports as base64 without UTF-8 encoding', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/a.xlsx' })
    share.mockResolvedValue({})
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await downloadOrShareFile(blob, 'a.xlsx')

    const writeArg = writeFile.mock.calls[0]?.[0] as {
      data: string
      encoding?: string
    }
    expect(writeArg.encoding).toBeUndefined()
    expect(typeof writeArg.data).toBe('string')
    expect(writeArg.data.length).toBeGreaterThan(0)
  })

  it('maps share dismiss to ShareCancelledError', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share.mockRejectedValue(new Error('Share canceled'))

    await expect(
      downloadOrShareFile(
        new Blob(['x'], { type: 'application/json' }),
        'backup.json',
      ),
    ).rejects.toBeInstanceOf(ShareCancelledError)
  })

  it('retries with files[] when Share.url fails for a non-cancel reason', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share
      .mockRejectedValueOnce(new Error('url not supported'))
      .mockResolvedValueOnce({})

    await downloadOrShareFile(
      new Blob(['{"ok":true}'], { type: 'application/json' }),
      'backup.json',
    )

    expect(share).toHaveBeenCalledTimes(2)
    expect(share.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        files: ['file:///cache/exports/backup.json'],
      }),
    )
  })
})
