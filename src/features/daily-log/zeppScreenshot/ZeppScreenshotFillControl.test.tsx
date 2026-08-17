import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
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

describe('ZeppScreenshotFillControl', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
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
})
