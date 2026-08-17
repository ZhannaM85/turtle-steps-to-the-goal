import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useTrackedFieldsStore } from '@/stores'
import { AutoSleepScreenshotFillControl } from './AutoSleepScreenshotFillControl'

vi.mock('../recognizeOnDeviceScreenshot', () => ({
  recognizeOnDeviceScreenshot: vi.fn(async () =>
    [
      'TODAY',
      'SUNDAY 16 → MONDAY 17',
      '10h 33m',
      'Sleep',
      'Quality 7h 59m',
      'Deep 3h 26m',
      'In bed 11:54',
      'Efficiency 89%',
      'HR 70',
    ].join('\n'),
  ),
}))

describe('AutoSleepScreenshotFillControl', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, autoSleepScreenshot: true },
    }))
  })

  it('shows parsed sleep values and confirms them (#748)', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { container } = render(
      <AutoSleepScreenshotFillControl
        asOfDate="2026-08-17"
        onConfirm={onConfirm}
      />,
    )

    const file = new File(['fake-png'], 'autosleep.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    await user.upload(input as HTMLInputElement, file)

    expect(
      await screen.findByRole('button', { name: 'Save these numbers' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Hours slept')).toHaveValue('10.55')
    expect(screen.getByLabelText('Deep sleep')).toHaveValue('3.43')

    await user.click(screen.getByRole('button', { name: 'Save these numbers' }))
    expect(onConfirm).toHaveBeenCalledWith({
      sleepHours: 10.55,
      deepSleepHours: 3.43,
    })
  })

  it('renders nothing when the AutoSleep screenshot toggle is off (#749)', () => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, autoSleepScreenshot: false },
    }))
    const { container } = render(
      <AutoSleepScreenshotFillControl
        asOfDate="2026-08-17"
        onConfirm={vi.fn()}
      />,
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: 'Fill from AutoSleep screenshot',
      }),
    ).not.toBeInTheDocument()
  })
})
