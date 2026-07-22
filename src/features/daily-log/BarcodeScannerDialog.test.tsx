import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'

const decodeFromVideoDevice = vi.fn()

vi.mock('@zxing/browser', () => ({
  // A real class, not `vi.fn().mockImplementation(() => ({...}))` — vitest
  // warns that pattern doesn't reliably support `new` (this component
  // calls `new BrowserMultiFormatReader()`). Instances share the one
  // module-level decodeFromVideoDevice mock so each test can reconfigure
  // its behavior directly.
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice = decodeFromVideoDevice
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('BarcodeScannerDialog', () => {
  it('shows instructions and a live camera preview while scanning', async () => {
    decodeFromVideoDevice.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    expect(
      screen.getByText('Point your camera at the barcode.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(decodeFromVideoDevice).toHaveBeenCalled())
  })

  it('calls onScanned and closes once a barcode is decoded', async () => {
    const onScanned = vi.fn()
    const onOpenChange = vi.fn()
    decodeFromVideoDevice.mockImplementation(
      async (_deviceId, _videoElement, callback) => {
        callback({ getText: () => '0123456789012' })
        return { stop: vi.fn() }
      },
    )

    render(
      <BarcodeScannerDialog
        open
        onOpenChange={onOpenChange}
        onScanned={onScanned}
      />,
    )

    await waitFor(() => expect(onScanned).toHaveBeenCalledWith('0123456789012'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows an error message when camera access fails', async () => {
    decodeFromVideoDevice.mockRejectedValue(new Error('Permission denied'))
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    expect(
      await screen.findByText(
        "Couldn't access the camera — check camera permissions and try again.",
      ),
    ).toBeInTheDocument()
  })
})
