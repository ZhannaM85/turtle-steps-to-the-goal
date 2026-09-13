import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import {
  useSettingsCardsCollapseStore,
  useSettingsPinStore,
} from '@/stores'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { SettingsPinnableCard } from './SettingsPinnableCard'

describe('SettingsPinnableCard (#873)', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' })
    useSettingsPinStore.setState({ pinned: [] })
    useSettingsCardsCollapseStore.getState().expandAll()
  })

  it('uses section-shell preference chrome, not number-card ring', () => {
    const { container } = render(
      <SettingsPinnableCard pinId="units">
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent>kg</CardContent>
      </SettingsPinnableCard>,
    )

    const panel = container.querySelector('[data-slot="settings-panel"]')
    expect(panel).toHaveClass('section-shell')
    expect(panel).not.toHaveClass('ring-1', 'rounded-xl')
    expect(container.querySelector('[data-slot="card"]')).toBeNull()
  })

  it('reserves header space for pin and collapse so the title can wrap', () => {
    const { container } = render(
      <SettingsPinnableCard pinId="trackedFields">
        <CardHeader>
          <CardTitle>Which fields to track</CardTitle>
        </CardHeader>
        <CardContent>fields</CardContent>
      </SettingsPinnableCard>,
    )

    expect(container.querySelector('[data-slot="settings-panel"]')).toHaveClass(
      '[&_[data-slot=card-header]]:!pe-28',
    )
    expect(
      screen.getByRole('button', { name: 'Pin to top' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Collapse' }),
    ).toBeInTheDocument()
  })

  it('reserves less header space when the card cannot be pinned', () => {
    const { container } = render(
      <SettingsPinnableCard pinId="about" pinnable={false}>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>about</CardContent>
      </SettingsPinnableCard>,
    )

    expect(container.querySelector('[data-slot="settings-panel"]')).toHaveClass(
      '[&_[data-slot=card-header]]:!pe-16',
    )
    expect(
      screen.queryByRole('button', { name: 'Pin to top' }),
    ).not.toBeInTheDocument()
  })
})
