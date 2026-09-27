import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { SETTINGS_CARD_KEYS, useLastBackupStore } from '@/stores'
import { releaseNotes } from '@/data/releaseNotes'
import {
  backupReminderStatus,
  BACKUP_REMINDER_SNOOZE_DAYS,
} from '@/shared/lib/lastBackupReminder'
import { useSeedBackupFirstSeenAt } from '@/shared/hooks/useSeedBackupFirstSeenAt'
import { Button } from '@/shared/ui/button'
import { NoticeBar } from '@/shared/ui/notice-bar'
import { PageHeader } from '@/shared/ui/page-header'
import { pageStickyUnderAppHeader } from '@/shared/ui/pageSticky'
import { SettingsBasicsCards } from './SettingsBasicsCards'
import {
  SettingsSearchField,
  SettingsSearchProvider,
} from './SettingsSearchField'
import { useSettingsSearchQuery } from './settingsSearchContext'
import { SettingsCardsCollapseControl } from './SettingsCardsCollapseControl'
import { SettingsLowerCards } from './SettingsLowerCards'
import { SettingsSectionHeading } from './SettingsSectionHeading'
import { SettingsTrackedFieldsSection } from './SettingsTrackedFieldsSection'
import {
  settingsCardVisible,
  settingsSearchQueryActive,
} from './settingsSearch'

export function SettingsScreen() {
  return (
    <SettingsSearchProvider>
      <SettingsScreenContent />
    </SettingsSearchProvider>
  )
}

function SettingsScreenContent() {
  const t = useTranslation()
  const query = useSettingsSearchQuery()
  const searching = settingsSearchQueryActive(query)
  const anyMatch = SETTINGS_CARD_KEYS.some((key) => {
    if (key === 'healthConnect' && Capacitor.getPlatform() !== 'android') {
      return false
    }
    return settingsCardVisible(key, query)
  })
  const currentVersion = releaseNotes[0]?.version

  useSeedBackupFirstSeenAt()
  const backupFirstSeenAt = useLastBackupStore((state) => state.firstSeenAt)
  const backupLastExportedAt = useLastBackupStore(
    (state) => state.lastExportedAt,
  )
  const backupDismissedUntil = useLastBackupStore(
    (state) => state.dismissedUntil,
  )
  const dismissBackupReminder = useLastBackupStore(
    (state) => state.dismissReminder,
  )
  const backupReminder = backupReminderStatus(
    {
      firstSeenAt: backupFirstSeenAt,
      lastExportedAt: backupLastExportedAt,
      dismissedUntil: backupDismissedUntil,
    },
    new Date(),
  )

  return (
    <div className="flex flex-col gap-6">
      <div
        className={pageStickyUnderAppHeader('flex flex-col gap-3 pb-3')}
        style={{ order: -4000 }}
      >
        <PageHeader
          title={t.settings.title}
          description={t.settings.description}
          action={
            <div className="flex flex-col items-end">
              {currentVersion !== undefined && (
                <Link
                  to="/about"
                  className="px-3 pt-0.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t.settings.versionBadgeLabel(currentVersion)}
                </Link>
              )}
              <SettingsCardsCollapseControl />
            </div>
          }
        />
        <SettingsSearchField />
      </div>
      {searching && !anyMatch && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
          style={{ order: -3500 }}
        >
          {t.settings.searchEmpty}
        </p>
      )}
      <SettingsSectionHeading group="logging" />
      <SettingsSectionHeading group="appearance" />
      <SettingsSectionHeading group="library" />
      <SettingsSectionHeading group="backup" />
      <SettingsSectionHeading group="danger" />

      {backupReminder.show && !searching && (
        <NoticeBar
          variant="nudge"
          role="status"
          style={{ order: -3000 }}
          actions={
            <>
              <Button variant="outline" size="sm" asChild>
                <a href="#export-section">
                  {t.export.backupReminderGoToExportLabel}
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.export.dismissBackupReminderLabel}
                onClick={() => {
                  const snoozeUntil = new Date()
                  snoozeUntil.setDate(
                    snoozeUntil.getDate() + BACKUP_REMINDER_SNOOZE_DAYS,
                  )
                  dismissBackupReminder(snoozeUntil.toISOString())
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </>
          }
        >
          {backupReminder.days === null
            ? t.export.lastBackupNeverLabel
            : t.export.lastBackupAgoLabel(backupReminder.days)}
        </NoticeBar>
      )}

      <SettingsBasicsCards />
      <SettingsTrackedFieldsSection />
      <SettingsLowerCards />
    </div>
  )
}
