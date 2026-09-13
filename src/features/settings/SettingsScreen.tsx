import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useLastBackupStore } from '@/stores'
import { releaseNotes } from '@/data/releaseNotes'
import {
  backupReminderStatus,
  BACKUP_REMINDER_SNOOZE_DAYS,
} from '@/shared/lib/lastBackupReminder'
import { useSeedBackupFirstSeenAt } from '@/shared/hooks/useSeedBackupFirstSeenAt'
import { Button } from '@/shared/ui/button'
import { NoticeBar } from '@/shared/ui/notice-bar'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsBasicsCards } from './SettingsBasicsCards'
import { SettingsCardsCollapseControl } from './SettingsCardsCollapseControl'
import { SettingsLowerCards } from './SettingsLowerCards'
import { SettingsTrackedFieldsSection } from './SettingsTrackedFieldsSection'

export function SettingsScreen() {
  const t = useTranslation()
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
    <div className="flex flex-col gap-4">
      <div style={{ order: -4000 }}>
        <PageHeader
          title={t.settings.title}
          description={t.settings.description}
          action={
            currentVersion !== undefined && (
              <Link
                to="/about"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t.settings.versionBadgeLabel(currentVersion)}
              </Link>
            )
          }
        />
      </div>

      <SettingsCardsCollapseControl />

      {backupReminder.show && (
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
