import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'

// #346 — a scannable "what can this app do" summary, distinct from
// AboutScreen's intro/philosophy copy and ReleaseNotesSection's
// chronological changelog (a log of changes over time, not a current
// snapshot). Content lives in `t.featuresOverview.categories` — a plain
// array, not a generated manifest — so it will drift out of sync with
// reality unless kept up to date by hand. There's no automated check for
// this; when a change materially adds/removes a user-facing capability,
// update the relevant category here too, the same manual-upkeep
// convention `about.tracking`'s own feature list already relies on.
export function FeaturesScreen() {
  const t = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.featuresOverview.title}
        description={t.featuresOverview.description}
      />

      <div className="flex flex-col gap-4">
        {t.featuresOverview.categories.map((category) => (
          <Card key={category.heading}>
            <CardHeader>
              <CardTitle>{category.heading}</CardTitle>
            </CardHeader>
            <CardContent>
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
        ))}
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
