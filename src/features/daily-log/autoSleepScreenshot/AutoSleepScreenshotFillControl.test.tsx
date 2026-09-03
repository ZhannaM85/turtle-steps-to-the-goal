import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useTrackedFieldsStore } from '@/stores'
import { AutoSleepScreenshotFillControl } from './AutoSleepScreenshotFillControl'
import { recognizeOnDeviceScreenshot } from '../recognizeOnDeviceScreenshot'

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

vi.mock('../prepareScreenshotForOcr', () => ({
  prepareAutoSleepScreenshotForOcr: vi.fn(async (image: Blob) => image),
}))

describe('AutoSleepScreenshotFillControl', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(recognizeOnDeviceScreenshot).mockClear()
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
    expect(screen.getByLabelText('Hours slept — hours')).toHaveValue('10')
    expect(screen.getByLabelText('Hours slept — minutes')).toHaveValue('33')
    expect(screen.getByLabelText('Deep sleep — hours')).toHaveValue('3')
    expect(screen.getByLabelText('Deep sleep — minutes')).toHaveValue('26')
    expect(screen.queryByDisplayValue('10.55')).not.toBeInTheDocument()
    expect(vi.mocked(recognizeOnDeviceScreenshot)).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Save these numbers' }))
    expect(onConfirm).toHaveBeenCalledWith({
      sleepHours: 10.55,
      deepSleepHours: 3 + 26 / 60,
    })
  })

  it('shows hours and minutes in Russian, not decimal hours (#751)', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const user = userEvent.setup()
    const { container } = render(
      <AutoSleepScreenshotFillControl
        asOfDate="2026-08-17"
        onConfirm={vi.fn()}
      />,
    )

    const file = new File(['fake-png'], 'autosleep.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]')
    await user.upload(input as HTMLInputElement, file)

    expect(
      await screen.findByRole('button', { name: 'Сохранить эти числа' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Часов сна — часов')).toHaveValue('10')
    expect(screen.getByLabelText('Часов сна — минут')).toHaveValue('33')
    expect(screen.getByLabelText('Глубокий сон — часов')).toHaveValue('3')
    expect(screen.getByLabelText('Глубокий сон — минут')).toHaveValue('26')
    expect(screen.queryByDisplayValue('10,55')).not.toBeInTheDocument()
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
    expect(
      screen.queryByRole('button', {
        name: 'About filling from an AutoSleep screenshot',
      }),
    ).not.toBeInTheDocument()
  })

  it('explains what screenshot to upload (#806)', async () => {
    const user = userEvent.setup()
    render(
      <AutoSleepScreenshotFillControl
        asOfDate="2026-08-17"
        onConfirm={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'About filling from an AutoSleep screenshot',
      }),
    )
    expect(
      await screen.findByText(/screenshot from AutoSleep \(Today or History\)/),
    ).toBeInTheDocument()
  })
})
