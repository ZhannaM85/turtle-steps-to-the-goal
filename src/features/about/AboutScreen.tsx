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

const AUTHOR = 'ZhannaM85'
const AUTHOR_GITHUB_URL = 'https://github.com/ZhannaM85'

export function AboutScreen() {
  const t = useTranslation()
  // Most-recent-first (see releaseNotes.ts), so the first entry's version
  // is the current one — shown prominently rather than only inside the
  // collapsed release-notes list, so a bug report can be pinned to a
  // specific version at a glance.
  const currentVersion = releaseNotes[0]?.version
  const [isReleaseNotesExpanded, setIsReleaseNotesExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.about.title} description={t.about.description} />

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

        {/* #655 — one card, title combines both since release notes are
         * keyed on the version number right next to them; the expand
         * toggle moved into the header (icon-only, no more separate
         * "Show release notes" button) next to that same title. */}
        {currentVersion !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t.settings.releaseNotesLabel} · {t.about.currentVersionLabel(currentVersion)}
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
