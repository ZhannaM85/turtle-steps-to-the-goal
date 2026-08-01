import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'

/** Stable category keys for screenshot mapping (#497) — not translated. */
export type FeaturesCategoryId =
  | 'dailyLogging'
  | 'meals'
  | 'goals'
  | 'dashboard'
  | 'correlations'
  | 'history'
  | 'yourData'
  | 'makeItYours'

const CATEGORY_SCREENSHOTS: Record<FeaturesCategoryId, string> = {
  dailyLogging: 'day.png',
  meals: 'day-meals.png',
  goals: 'goal.png',
  dashboard: 'dashboard.png',
  correlations: 'correlations.png',
  history: 'history.png',
  yourData: 'export.png',
  makeItYours: 'appearance.png',
}

function screenshotSrc(file: string): string {
  const base = import.meta.env.BASE_URL
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}screenshots/${file}`
}

// #346 — a scannable "what can this app do" summary, distinct from
// AboutScreen's intro/philosophy copy and ReleaseNotesSection's
// chronological changelog (a log of changes over time, not a current
// snapshot). Content lives in `t.featuresOverview.categories` — a plain
// array, not a generated manifest — so it will drift out of sync with
// reality unless kept up to date by hand. There's no automated check for
// this; when a change materially adds/removes a user-facing capability,
// update the relevant category here too, the same manual-upkeep
// convention `about.tracking`'s own feature list already relies on.
// #497 — each category card includes a matching app screenshot from
// `public/screenshots/` (shared with the README; regenerate via
// `scripts/capture-screenshots.mjs`).
export function FeaturesScreen() {
  const t = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.featuresOverview.title}
        description={t.featuresOverview.description}
      />

      <div className="flex flex-col gap-4">
        {t.featuresOverview.categories.map((category) => {
          const file = CATEGORY_SCREENSHOTS[category.id]
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.heading}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <img
                  src={screenshotSrc(file)}
                  alt={t.featuresOverview.screenshotAlt(category.heading)}
                  loading="lazy"
                  className="max-h-96 w-full rounded-md border border-border object-cover object-top"
                />
                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {category.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Link
        to="/about"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t.featuresOverview.backToAboutLabel}
      </Link>
    </div>
  )
}
