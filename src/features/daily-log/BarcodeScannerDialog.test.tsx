import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('shows an error message including the underlying error name when camera access fails (#291)', async () => {
    decodeFromVideoDevice.mockRejectedValue(new Error('Permission denied'))
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    expect(
      await screen.findByText(
        "Couldn't access the camera — check camera permissions and try again. (Error)",
      ),
    ).toBeInTheDocument()
  })

  it('shows a searching message while onScanned is still in flight (#292)', async () => {
    let resolveScan: () => void = () => {}
    const onScanned = vi.fn(
      () => new Promise<void>((resolve) => (resolveScan = resolve)),
    )
    decodeFromVideoDevice.mockImplementation(
      async (_deviceId, _videoElement, callback) => {
        callback({ getText: () => '0123456789012' })
        return { stop: vi.fn() }
      },
    )

    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={onScanned} />,
    )

    expect(
      await screen.findByText('Searching for this product…'),
    ).toBeInTheDocument()

    resolveScan()
    await waitFor(() => expect(onScanned).toHaveBeenCalledWith('0123456789012'))
  })

  describe('manual barcode entry (#291)', () => {
    it('calls onScanned with the typed barcode and closes', async () => {
      const onScanned = vi.fn()
      const onOpenChange = vi.fn()
      decodeFromVideoDevice.mockResolvedValue({ stop: vi.fn() })
      const user = userEvent.setup()

      render(
        <BarcodeScannerDialog
          open
          onOpenChange={onOpenChange}
          onScanned={onScanned}
        />,
      )

      await user.type(
        screen.getByLabelText('Or enter the barcode number'),
        '0123456789012',
      )
      await user.click(screen.getByRole('button', { name: 'Search' }))

      await waitFor(() =>
        expect(onScanned).toHaveBeenCalledWith('0123456789012'),
      )
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables the search button until something is typed', async () => {
      decodeFromVideoDevice.mockResolvedValue({ stop: vi.fn() })
      render(
        <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
      )

      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled()
    })

    it('is still available when the camera fails, so a report can isolate the two', async () => {
      decodeFromVideoDevice.mockRejectedValue(new Error('NotAllowedError'))
      render(
        <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
      )

      await screen.findByText(/Couldn't access the camera/)
      expect(
        screen.getByLabelText('Or enter the barcode number'),
      ).toBeInTheDocument()
    })
  })
})
