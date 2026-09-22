import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import {
  db,
  IndexedDbDailyEntryRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useTrackedFieldsStore } from '@/stores'
import { AutoSleepScreenshotFillControl } from './AutoSleepScreenshotFillControl'
import { recognizeOnDeviceScreenshot } from '../recognizeOnDeviceScreenshot'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

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
  beforeEach(async () => {
    localStorage.clear()
    await db.dailyEntries.clear()
    vi.mocked(recognizeOnDeviceScreenshot).mockClear()
    useLocaleStore.setState({ locale: 'en' })
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, autoSleepScreenshot: true },
    }))
  })

  afterEach(async () => {
    await db.dailyEntries.clear()
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

  it('shows sleep and deep-sleep deltas vs yesterday (#976)', async () => {
    const now = new Date().toISOString()
    await dailyEntryRepository.upsert({
      id: 'yesterday',
      date: '2026-08-16',
      sleepHours: 10 + 21 / 60,
      deepSleepHours: 4,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })

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
    await user.upload(input as HTMLInputElement, file)

    const sleepDelta = await screen.findByText(
      /↑ 0h 12m compared to yesterday/,
    )
    expect(sleepDelta.className).toMatch(/status-good/)
    const deepDelta = screen.getByText(/↓ 0h 34m compared to yesterday/)
    expect(deepDelta.className).toMatch(/status-warn/)
    expect(onConfirm).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Hours slept — minutes'))
    await user.type(screen.getByLabelText('Hours slept — minutes'), '21')
    expect(
      screen.queryByText(/↑ 0h 12m compared to yesterday/),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/↓ 0h 34m compared to yesterday/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save these numbers' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith({
      sleepHours: 10 + 21 / 60,
      deepSleepHours: 3 + 26 / 60,
    })
  })

  it('omits a delta when yesterday has no value for that metric (#976)', async () => {
    const now = new Date().toISOString()
    await dailyEntryRepository.upsert({
      id: 'yesterday-sleep-only',
      date: '2026-08-16',
      sleepHours: 10 + 21 / 60,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })
    await dailyEntryRepository.upsert({
      id: 'older',
      date: '2026-08-15',
      sleepHours: 8,
      deepSleepHours: 2,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })

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
      await screen.findByText(/↑ 0h 12m compared to yesterday/),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/compared to yesterday/)).toHaveLength(1)
    expect(screen.queryByText(/0h 0m/)).not.toBeInTheDocument()
  })

  it('omits deltas when yesterday has no sleep entry (#976)', async () => {
    const now = new Date().toISOString()
    await dailyEntryRepository.upsert({
      id: 'older-only',
      date: '2026-08-15',
      sleepHours: 8,
      deepSleepHours: 2,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })

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
      await screen.findByRole('button', { name: 'Save these numbers' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/compared to yesterday/)).not.toBeInTheDocument()
  })

  it('shows the yesterday delta in Russian (#976)', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const now = new Date().toISOString()
    await dailyEntryRepository.upsert({
      id: 'yesterday-ru',
      date: '2026-08-16',
      sleepHours: 10 + 21 / 60,
      deepSleepHours: 3 + 26 / 60,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })

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
      await screen.findByText(/↑ 0ч 12м по сравнению со вчера/),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/по сравнению со вчера/)).toHaveLength(1)
  })
})
