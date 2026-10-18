import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadOrShareFile,
  ShareCancelledError,
} from './downloadOrShareFile'

const isNativePlatform = vi.fn(() => false)
const writeFile = vi.fn()
const appendFile = vi.fn()
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
    appendFile: (...args: unknown[]) => appendFile(...args),
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
    appendFile.mockReset()
    getUri.mockReset()
    share.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
    })
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

  it('prefers navigator.share with a File on native when available', async () => {
    isNativePlatform.mockReturnValue(true)
    const shareNav = vi.fn().mockResolvedValue(undefined)
    const canShare = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'share', {
      value: shareNav,
      configurable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: canShare,
      configurable: true,
    })

    await downloadOrShareFile(
      new Blob(['{"ok":true}'], { type: 'application/json' }),
      'backup.json',
    )

    expect(canShare).toHaveBeenCalled()
    expect(shareNav).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [expect.any(File)],
      }),
    )
    expect(writeFile).not.toHaveBeenCalled()
    expect(share).not.toHaveBeenCalled()
  })

  it('writes JSON via Cache + Share.files when Web Share is unavailable (#1102)', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share.mockResolvedValue({
      activityType: 'com.apple.DocumentManagerUICore.SaveToFiles',
    })

    await downloadOrShareFile(
      new Blob(['{"ok":true}'], { type: 'application/json' }),
      'backup.json',
    )

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'exports/backup.json',
        data: '{"ok":true}',
        directory: 'CACHE',
        encoding: 'utf8',
        recursive: true,
      }),
    )
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ['file:///cache/exports/backup.json'],
        title: 'backup.json',
      }),
    )
  })

  it('appends UTF-8 chunks for large text backups', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({})
    appendFile.mockResolvedValue({})
    getUri.mockResolvedValue({ uri: 'file:///cache/exports/big.json' })
    share.mockResolvedValue({})
    const text = 'a'.repeat(300_000)

    await downloadOrShareFile(
      new Blob([text], { type: 'application/json' }),
      'big.json',
    )

    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(appendFile).toHaveBeenCalled()
    const appended = appendFile.mock.calls.reduce(
      (n, [arg]) => n + String((arg as { data: string }).data).length,
      0,
    )
    expect(appended + 256 * 1024).toBe(text.length)
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
})
