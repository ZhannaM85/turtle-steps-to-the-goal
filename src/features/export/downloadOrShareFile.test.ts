import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadOrShareFile,
  ShareCancelledError,
} from './downloadOrShareFile'

const isNativePlatform = vi.fn(() => false)
const writeFile = vi.fn()
const share = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    writeFile: (...args: unknown[]) => writeFile(...args),
  },
}))

vi.mock('@capacitor/share', () => ({
  Share: {
    share: (...args: unknown[]) => share(...args),
  },
}))

describe('downloadOrShareFile (#1101)', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false)
    writeFile.mockReset()
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

  it('writes Cache + Share.share on native', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share.mockResolvedValue({ activityType: 'com.apple.DocumentManagerUICore.SaveToFiles' })
    const blob = new Blob(['{"ok":true}'], { type: 'application/json' })

    await downloadOrShareFile(blob, 'backup.json')

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'exports/backup.json',
        directory: 'CACHE',
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

  it('maps share dismiss to ShareCancelledError', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({ uri: 'file:///cache/exports/backup.json' })
    share.mockRejectedValue(new Error('Share canceled'))

    await expect(
      downloadOrShareFile(new Blob(['x']), 'backup.json'),
    ).rejects.toBeInstanceOf(ShareCancelledError)
  })
})
