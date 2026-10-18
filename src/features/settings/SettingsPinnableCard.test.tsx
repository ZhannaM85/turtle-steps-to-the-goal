import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { useLocaleStore } from '@/i18n'
import {
  useSettingsCardsCollapseStore,
  useSettingsPinStore,
} from '@/stores'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { SettingsPinnableCard } from './SettingsPinnableCard'
import { SettingsSearchContext } from './settingsSearchContext'

function renderWithSearch(ui: ReactElement, query = '') {
  return render(
    <SettingsSearchContext.Provider
      value={{ query, setQuery: () => {} }}
    >
      {ui}
    </SettingsSearchContext.Provider>,
  )
}

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

  it('uses a transparent collapse chevron, not a filled chip (#967)', () => {
    render(
      <SettingsPinnableCard pinId="units">
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent>kg</CardContent>
      </SettingsPinnableCard>,
    )

    const collapse = screen.getByRole('button', { name: 'Collapse' })
    expect(collapse).toHaveClass('bg-transparent')
    expect(collapse.className).not.toMatch(/\bbg-muted\b/)
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(collapse.querySelector('[data-slot="collapse-chevron"]')).toHaveClass(
      'bg-transparent',
    )
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

  it('hides the collapse control when the card is not collapsible (#966)', () => {
    const { container } = render(
      <SettingsPinnableCard pinId="about" pinnable={false} collapsible={false}>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>about</CardContent>
      </SettingsPinnableCard>,
    )

    const panel = container.querySelector('[data-slot="settings-panel"]')
    expect(panel).not.toHaveClass('[&_[data-slot=card-header]]:!pe-16')
    expect(panel).not.toHaveClass('[&_[data-slot=card-header]]:cursor-pointer')
    expect(
      screen.queryByRole('button', { name: 'Collapse' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Expand' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('about')).toBeInTheDocument()
  })

  it('collapses a matching card while Settings search is active (#1103)', async () => {
    const user = userEvent.setup()
    const { container } = renderWithSearch(
      <SettingsPinnableCard pinId="export">
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent>backup body</CardContent>
      </SettingsPinnableCard>,
      'Export',
    )

    expect(screen.getByText('backup body')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse' }))

    expect(
      useSettingsCardsCollapseStore.getState().cards.export,
    ).toBe(true)
    expect(container.querySelector('[data-slot="settings-panel"]')).toHaveClass(
      '[&_[data-slot=card-content]]:hidden',
    )
    expect(
      screen.getByRole('button', { name: 'Expand' }),
    ).toHaveAttribute('aria-expanded', 'false')
  })
})

