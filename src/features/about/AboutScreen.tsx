import { useState } from 'react'
import { ChevronDown, ChevronUp, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { releaseNotes } from '@/data/releaseNotes'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { ReleaseNotesSection } from './ReleaseNotesSection'
import { StoreVersionHistory } from './StoreVersionHistory'
import { useInstalledAppInfo } from './useInstalledAppInfo'

const AUTHOR = 'ZhannaM85'
const AUTHOR_GITHUB_URL = 'https://github.com/ZhannaM85'

export function AboutScreen() {
  const t = useTranslation()
  // Most-recent-first (see releaseNotes.ts). The number on the release-notes
  // card is the internal change counter, so a bug report can be pinned to
  // a change. It is not the installed App Store version (#1130).
  const currentVersion = releaseNotes[0]?.version
  const installedApp = useInstalledAppInfo()
  const [isReleaseNotesExpanded, setIsReleaseNotesExpanded] = useState(false)
  const [isStoreHistoryExpanded, setIsStoreHistoryExpanded] = useState(false)
  const appVersionText =
    installedApp?.kind === 'web'
      ? t.about.appVersionWeb
      : installedApp?.kind === 'native'
        ? t.about.appVersionNative(installedApp.version, installedApp.build)
        : installedApp?.kind === 'unavailable'
          ? t.about.appVersionUnavailable
          : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.about.title} />

      {/* #498 — Features / Privacy / Version lead as cards so they aren't
       * quiet text links under a wall of prose. Narrative copy stays below. */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t.featuresOverview.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              {t.featuresOverview.description}
            </span>
            <Button variant="outline" size="sm" className="self-start" asChild>
              <Link to="/features">{t.about.viewFeaturesLabel}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.privacyPolicy.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              {t.privacyPolicy.description}
            </span>
            <Button variant="outline" size="sm" className="self-start" asChild>
              <Link to="/privacy">{t.about.readPrivacyPolicyLabel}</Link>
            </Button>
          </CardContent>
        </Card>

        {/* #1130 — installed bundle version, read at runtime. Web has no
         * native info, so this row says so instead of showing a number. */}
        <Card>
          <CardHeader>
            <CardTitle>{t.about.appVersionLabel}</CardTitle>
          </CardHeader>
          {appVersionText !== null && (
            <CardContent>
              <p className="text-sm text-foreground">{appVersionText}</p>
            </CardContent>
          )}
        </Card>

        {/* #1130 — App Store versions, separate from the internal counter. */}
        <Card>
          <CardHeader>
            <CardTitle>{t.about.storeVersionsLabel}</CardTitle>
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={
                  isStoreHistoryExpanded
                    ? t.about.hideStoreVersions
                    : t.about.showStoreVersions
                }
                aria-expanded={isStoreHistoryExpanded}
                onClick={() => setIsStoreHistoryExpanded((prev) => !prev)}
              >
                {isStoreHistoryExpanded ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
              </Button>
            </CardAction>
          </CardHeader>
          {isStoreHistoryExpanded && (
            <CardContent>
              <StoreVersionHistory />
            </CardContent>
          )}
        </Card>

        {/* #655 — one card, title combines both since release notes are
         * keyed on the internal change counter right next to them; the
         * expand toggle sits in the header. #1130 — that number is the
         * internal counter, not the store version. */}
        {currentVersion !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t.settings.releaseNotesLabel} · {t.about.internalChangeLabel(currentVersion)}
              </CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={
                    isReleaseNotesExpanded
                      ? t.settings.hideReleaseNotes
                      : t.settings.showReleaseNotes
                  }
                  aria-expanded={isReleaseNotesExpanded}
                  onClick={() => setIsReleaseNotesExpanded((prev) => !prev)}
                >
                  {isReleaseNotesExpanded ? (
                    <ChevronUp aria-hidden="true" />
                  ) : (
                    <ChevronDown aria-hidden="true" />
                  )}
                </Button>
              </CardAction>
            </CardHeader>
            {isReleaseNotesExpanded && (
              <CardContent>
                <ReleaseNotesSection />
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>{t.about.intro}</p>
        <p>{t.about.tracking}</p>
        <p>{t.about.philosophy}</p>
        <p className="font-medium text-foreground">{t.about.privacyHeading}</p>
        <p>{t.about.privacy}</p>
      </div>

      <a
        href={AUTHOR_GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <Heart
          aria-hidden="true"
          className="size-4 shrink-0"
          fill="currentColor"
        />
        {t.about.madeBy(AUTHOR)}
      </a>
    </div>
  )
}
