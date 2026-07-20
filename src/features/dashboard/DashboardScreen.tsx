import { useTranslation } from '@/i18n'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { CalorieTrendChart } from './CalorieTrendChart'
import { CorrelationView } from './CorrelationView'
import { CustomChartView } from './CustomChartView'
import { FoodReactionsView } from './FoodReactionsView'
import { LateMealCorrelationView } from './LateMealCorrelationView'
import { MacroTrendChart } from './MacroTrendChart'
import { MonthlySummaryCards } from './MonthlySummaryCards'
import { SleepCorrelationView } from './SleepCorrelationView'
import { StepsCorrelationView } from './StepsCorrelationView'
import { WeeklySummaryCards } from './WeeklySummaryCards'
import { WeightTrendChart } from './WeightTrendChart'
import { useDashboardData } from './useDashboardData'

export function DashboardScreen() {
  const t = useTranslation()
  const { goal, entries, status } = useDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.description}
      />

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title={t.dashboard.emptyTitle}
          description={t.dashboard.emptyDescription}
        />
      ) : (
        <>
          <WeightTrendChart entries={entries} />
          <CalorieTrendChart entries={entries} />
          <MacroTrendChart entries={entries} />
          <CustomChartView entries={entries} />
          <CorrelationView entries={entries} />
          <LateMealCorrelationView entries={entries} />
          <SleepCorrelationView entries={entries} />
          <StepsCorrelationView entries={entries} />
          <FoodReactionsView entries={entries} />
          <WeeklySummaryCards entries={entries} goal={goal} />
          <MonthlySummaryCards entries={entries} />
        </>
      )}
    </div>
  )
}
