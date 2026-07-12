import { useTranslation } from '@/i18n'
import { PageHeader } from '@/shared/ui/page-header'

export function HistoryScreen() {
  const t = useTranslation()
  return (
    <PageHeader title={t.history.title} description={t.history.description} />
  )
}
