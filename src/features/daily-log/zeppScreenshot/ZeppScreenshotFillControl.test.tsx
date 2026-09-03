import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import {
  db,
  IndexedDbDailyEntryRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useEntryComparisonStore, useTrackedFieldsStore } from '@/stores'
import { ZeppScreenshotFillControl } from './ZeppScreenshotFillControl'

vi.mock('./recognizeZeppScreenshot', () => ({
  recognizeZeppScreenshot: vi.fn(async () =>
    [
      '17 August at 11:30',
      'BMI 21,8 Normal',
      'Body fat 32,7 % Normal',
      'Muscle 37,61 kg Great',
      'Water 48,0 % Normal',
      'Visceral fat 5 Normal',
      'Bone mass 2,33 kg Normal',
    ].join('\n'),
  ),
}))

vi.mock('../prepareScreenshotForOcr', () => ({
  prepareZeppScreenshotForOcr: vi.fn(async (image: Blob) => image),
}))

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

describe('ZeppScreenshotFillControl', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.dailyEntries.clear()
    useLocaleStore.setState({ locale: 'en' })
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, zeppScreenshot: true },
    }))
    useEntryComparisonStore.setState({ enabled: true })
  })

  afterEach(async () => {
    await db.dailyEntries.clear()
  })

  it('shows parsed values and confirms them', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { container } = render(
      <ZeppScreenshotFillControl asOfDate="2026-08-17" onConfirm={onConfirm} />,
    )

    const file = new File(['fake-png'], 'zepp.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    await user.upload(input as HTMLInputElement, file)

    expect(
      await screen.findByRole('button', { name: 'Save these numbers' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Muscle mass')).toHaveValue('37.61')
    expect(screen.getByLabelText('Visceral fat')).toHaveValue('5')
    expect(screen.getByLabelText('Body water')).toHaveValue('48')
    expect(screen.getByLabelText('Bone mass')).toHaveValue('2.33')
    expect(screen.getByLabelText('Body fat')).toHaveValue('32.7')

    await user.click(screen.getByRole('button', { name: 'Save these numbers' }))
    expect(onConfirm).toHaveBeenCalledWith({
      muscleMassKg: 37.61,
      visceralFatRating: 5,
      bodyWaterPercent: 48,
      boneMassKg: 2.33,
      bodyFatPercent: 32.7,
    })
  })

  it('shows vs-yesterday diffs under confirm fields (#805)', async () => {
    const now = new Date().toISOString()
    await dailyEntryRepository.upsert({
      id: 'yesterday',
      date: '2026-08-16',
      muscleMassKg: 36.21,
      visceralFatRating: 5,
      bodyWaterPercent: 45.6,
      boneMassKg: 2.34,
      bodyFatPercent: 36,
      calorieEntries: [],
      createdAt: now,
      updatedAt: now,
    })

    const user = userEvent.setup()
    const { container } = render(
      <ZeppScreenshotFillControl asOfDate="2026-08-17" onConfirm={vi.fn()} />,
    )

    const file = new File(['fake-png'], 'zepp.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]')
    await user.upload(input as HTMLInputElement, file)

    expect(
      await screen.findByRole('button', { name: 'Save these numbers' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/↑ 1\.4 kg compared to yesterday/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/↑ 2\.4% compared to yesterday/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/↓ 3\.3% compared to yesterday/),
    ).toBeInTheDocument()
  })

  it('renders nothing when the Zepp screenshot toggle is off (#749)', () => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, zeppScreenshot: false },
    }))
    const { container } = render(
      <ZeppScreenshotFillControl asOfDate="2026-08-17" onConfirm={vi.fn()} />,
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: 'Fill from Zepp screenshot',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'About filling from a Zepp screenshot',
      }),
    ).not.toBeInTheDocument()
  })

  it('explains what screenshot to upload (#806)', async () => {
    const user = userEvent.setup()
    render(
      <ZeppScreenshotFillControl asOfDate="2026-08-17" onConfirm={vi.fn()} />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'About filling from a Zepp screenshot',
      }),
    )
    expect(
      await screen.findByText(/Zepp Life’s body composition or reached-goals/),
    ).toBeInTheDocument()
  })
})
