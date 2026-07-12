import { useTranslation } from '@/i18n'
import { PageHeader } from '@/shared/ui/page-header'

export function DashboardScreen() {
  const t = useTranslation()
  return (
    <PageHeader
      title={t.dashboard.title}
      description={t.dashboard.description}
    />
  )
}
