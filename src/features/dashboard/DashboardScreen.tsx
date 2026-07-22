import { useTranslation } from '@/i18n'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { BodyCompositionTrendChart } from './BodyCompositionTrendChart'
import { CalorieTrendChart } from './CalorieTrendChart'
import { CompareRangesView } from './CompareRangesView'
import { CorrelationView } from './CorrelationView'
import { CustomChartView } from './CustomChartView'
import { FastingCutoffComparisonView } from './FastingCutoffComparisonView'
import { FastingWindowCorrelationView } from './FastingWindowCorrelationView'
import { FoodReactionsView } from './FoodReactionsView'
import { LateMealCorrelationView } from './LateMealCorrelationView'
import { MacroTrendChart } from './MacroTrendChart'
import { LoggingConsistencyHeatmap } from './LoggingConsistencyHeatmap'
import { MonthlySummaryCards } from './MonthlySummaryCards'
import { ProteinCorrelationView } from './ProteinCorrelationView'
import { RecentAveragesCards } from './RecentAveragesCards'
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
          <BodyCompositionTrendChart entries={entries} />
          <CustomChartView entries={entries} />
          <CorrelationView entries={entries} />
          <LateMealCorrelationView entries={entries} />
          <FastingWindowCorrelationView entries={entries} />
          <FastingCutoffComparisonView entries={entries} />
          <SleepCorrelationView entries={entries} />
          <StepsCorrelationView entries={entries} />
          <ProteinCorrelationView entries={entries} />
          <FoodReactionsView entries={entries} />
          <LoggingConsistencyHeatmap entries={entries} />
          <RecentAveragesCards entries={entries} />
          <WeeklySummaryCards entries={entries} goal={goal} />
          <MonthlySummaryCards entries={entries} />
          <CompareRangesView entries={entries} />
        </>
      )}
    </div>
  )
}
