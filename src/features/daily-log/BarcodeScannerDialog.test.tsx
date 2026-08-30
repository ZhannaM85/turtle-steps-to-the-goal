import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'

const decodeFromConstraints = vi.fn()
// #294 — captures the constructor's hints argument so a test can verify
// the component actually restricts decoding to retail formats, without
// the mock needing to replicate zxing's own real hint-processing.
let capturedHints: Map<unknown, unknown> | undefined

vi.mock('@zxing/browser', () => ({
  // A real class, not `vi.fn().mockImplementation(() => ({...}))` — vitest
  // warns that pattern doesn't reliably support `new` (this component
  // calls `new BrowserMultiFormatReader()`). Instances share the one
  // module-level decodeFromConstraints mock so each test can reconfigure
  // its behavior directly.
  BrowserMultiFormatReader: class {
    decodeFromConstraints = decodeFromConstraints
    constructor(hints?: Map<unknown, unknown>) {
      capturedHints = hints
    }
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  capturedHints = undefined
  // Unconditional, not just at the end of the one test that fakes timers —
  // if that test's own assertion throws before reaching its own cleanup
  // call, fake timers would otherwise leak into every later test in this
  // file, which then hang (their own async waitFor/effects rely on real
  // timers) until they hit vitest's real 5000ms test timeout.
  vi.useRealTimers()
})

describe('BarcodeScannerDialog', () => {
  it('shows instructions and a live camera preview while scanning', async () => {
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    expect(
      screen.getByText(
        'Point your camera at the barcode. Tap inside the frame to focus.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: 'Tap to focus on barcode' }),
    ).toBeInTheDocument()
  })

  it('calls onScanned and closes once a barcode is decoded', async () => {
    const onScanned = vi.fn()
    const onOpenChange = vi.fn()
    decodeFromConstraints.mockImplementation(
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
    decodeFromConstraints.mockRejectedValue(new Error('Permission denied'))
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
    decodeFromConstraints.mockImplementation(
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

  it('schedules the "still scanning" tip after a delay, not shown immediately (#294)', async () => {
    // A spy (not fake timers) — this component's real dynamic-import +
    // Promise-based camera start, combined with React's own scheduler
    // (which can use MessageChannel, not just setTimeout, for flushing
    // effects), made simulating the actual passage of time with fake
    // timers unreliable in practice. Confirming a timer was scheduled with
    // the exact right delay is enough regression coverage for this — the
    // callback firing and updating state is the same well-exercised
    // setState-then-rerender path every other test in this file relies on.
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    expect(
      screen.queryByText(
        'Still scanning — make sure the barcode is well-lit, in focus, and fills the frame above. Tap the frame to refocus.',
      ),
    ).not.toBeInTheDocument()
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000)
  })

  it('keeps manual entry pinned when the still-scanning tip appears (#695)', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    const tipCall = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 4000,
    )
    expect(tipCall).toBeDefined()
    await act(async () => {
      ;(tipCall![0] as () => void)()
    })

    expect(
      await screen.findByText(
        'Still scanning — make sure the barcode is well-lit, in focus, and fills the frame above. Tap the frame to refocus.',
      ),
    ).toBeInTheDocument()
    const manual = screen.getByLabelText('Or enter the barcode number')
    expect(manual).toBeInTheDocument()
    expect(manual.closest('[data-barcode-manual-entry]')).toHaveClass(
      'shrink-0',
    )
  })

  it('restricts decoding to retail barcode formats for speed (#294)', async () => {
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled())
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
    expect(capturedHints?.get(DecodeHintType.POSSIBLE_FORMATS)).toEqual([
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ])
  })

  it('uses a high-res rear camera and TRY_HARDER so slightly soft close-ups still decode (#777)', async () => {
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled())
    const { DecodeHintType } = await import('@zxing/library')
    expect(capturedHints?.get(DecodeHintType.TRY_HARDER)).toBe(true)
    expect(decodeFromConstraints.mock.calls[0][0]).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })
  })

  it('schedules periodic center refocus while the camera is running (#777)', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
    )

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled())
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1500)
  })

  describe('manual barcode entry (#291)', () => {
    it('calls onScanned with the typed barcode and closes', async () => {
      const onScanned = vi.fn()
      const onOpenChange = vi.fn()
      decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
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
      decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
      render(
        <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
      )

      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled()
    })

    it('is still available when the camera fails, so a report can isolate the two', async () => {
      decodeFromConstraints.mockRejectedValue(new Error('NotAllowedError'))
      render(
        <BarcodeScannerDialog open onOpenChange={vi.fn()} onScanned={vi.fn()} />,
      )

      await screen.findByText(/Couldn't access the camera/)
      expect(
        screen.getByLabelText('Or enter the barcode number'),
      ).toBeInTheDocument()
    })
  })

  it('offers scan-from-photo instead of manual barcode entry in QR mode (#723)', async () => {
    decodeFromConstraints.mockResolvedValue({ stop: vi.fn() })
    render(
      <BarcodeScannerDialog
        open
        onOpenChange={vi.fn()}
        onScanned={vi.fn()}
        scanKind="qr"
        title="Scan a day’s log"
      />,
    )

    expect(await screen.findByText('Scan a day’s log')).toBeInTheDocument()
    expect(screen.getByText('Scan from photo')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Or enter the barcode number'),
    ).not.toBeInTheDocument()
  })
})
