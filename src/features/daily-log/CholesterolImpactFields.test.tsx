import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useLdlImpactStore } from '@/stores'
import { CholesterolImpactFields } from './CholesterolImpactFields'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'ru' })
  useLdlImpactStore.setState({ enabled: false })
})

describe('CholesterolImpactFields (#1013)', () => {
  it('hides the picker when the LDL setting is off', () => {
    render(
      <CholesterolImpactFields
        impact="limit"
        reason="Много сыра"
        onCholesterolChange={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('cholesterol-impact-picker')).toBeNull()
    expect(screen.queryByTestId('cholesterol-reason')).toBeNull()
  })

  it('offers every level and an optional reason when the setting is on', async () => {
    const user = userEvent.setup()
    const onCholesterolChange = vi.fn()
    useLdlImpactStore.setState({ enabled: true })

    render(
      <CholesterolImpactFields
        impact="unknown"
        reason=""
        onCholesterolChange={onCholesterolChange}
      />,
    )

    const picker = screen.getByTestId('cholesterol-impact-picker')
    expect(picker).toHaveValue('unknown')
    expect(screen.getByRole('option', { name: 'Помогает' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Нейтрально' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Умеренно' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Лимит' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Высокое' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Неизвестно' })).toBeInTheDocument()
    expect(
      screen.getByText('Качественная пометка про ЛПНП, не медицинская оценка.'),
    ).toBeInTheDocument()

    await user.selectOptions(picker, 'limit')
    expect(onCholesterolChange).toHaveBeenCalledWith({
      cholesterolImpact: 'limit',
    })

    await user.type(screen.getByTestId('cholesterol-reason'), 'Сыр')
    expect(onCholesterolChange).toHaveBeenCalledWith({
      cholesterolReason: 'С',
    })
  })
})
