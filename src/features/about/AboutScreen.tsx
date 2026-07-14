import { Heart } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { PageHeader } from '@/shared/ui/page-header'

const AUTHOR = 'zhannam85'
const AUTHOR_GITHUB_URL = 'https://github.com/ZhannaM85'

export function AboutScreen() {
  const t = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.about.title} description={t.about.description} />

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>{t.about.intro}</p>
        <p>{t.about.philosophy}</p>
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
