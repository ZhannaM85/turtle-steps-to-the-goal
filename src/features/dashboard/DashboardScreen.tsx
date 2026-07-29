import { useEffect, useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  filterEntriesByTrendChartPeriod,
  resolveTrendChartPeriodRange,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import type { DashboardChartKey } from '@/stores'
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  useCustomCorrelationStore,
  useCustomMetricStore,
  useDashboardPeriodStore,
  useDashboardSectionOrderStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { BodyCompositionTrendChart } from './BodyCompositionTrendChart'
import { CalorieTrendChart } from './CalorieTrendChart'
import { CompareRangesView } from './CompareRangesView'
import { CorrelationView } from './CorrelationView'
import { CustomChartView } from './CustomChartView'
import { CustomCorrelationView } from './CustomCorrelationView'
import { DashboardPeriodPicker } from './DashboardPeriodPicker'
import { FastingWindowCorrelationView } from './FastingWindowCorrelationView'
import { FoodReactionsView } from './FoodReactionsView'
import { LateMealCorrelationView } from './LateMealCorrelationView'
import { MealFrequencyCorrelationView } from './MealFrequencyCorrelationView'
import { MacroTrendChart } from './MacroTrendChart'
import { LoggingConsistencyHeatmap } from './LoggingConsistencyHeatmap'
import { MonthlySummaryCards } from './MonthlySummaryCards'
import { NightEatingCorrelationView } from './NightEatingCorrelationView'
import { ProteinCorrelationView } from './ProteinCorrelationView'
import { RecentAveragesCards } from './RecentAveragesCards'
import { SleepCorrelationView } from './SleepCorrelationView'
import { StepsCorrelationView } from './StepsCorrelationView'
import { WeeklySummaryCards } from './WeeklySummaryCards'
import { WeightTrendChart } from './WeightTrendChart'
import { useDashboardData } from './useDashboardData'

// #297 — drag-and-drop reordering, purely additive so it doesn't depend on
// what a given section renders internally. #319 — the handle (and dragging
// itself) is now only shown/active while the page is in its on-demand
// reorder mode, rather than always visible; `disabled` on `useSortable`
// (same option `MealListItem` already uses for its own isEditing/
// isConfirmingDelete states) stops dnd-kit from treating the section as
// draggable at all outside that mode, not just hiding the handle visually.
// #355 — reported live: the handle rendered on its own line above the
// whole section (title included) instead of beside just the title text.
// Every one of the 18 sections' own title already funnels through the one
// shared `ChartTitleWithToggle`/`SectionTitleWithToggle` pair (#245/#247),
// so rather than each section inventing its own fix, `children` is now a
// render-prop that receives the fully-built handle element — each section
// forwards it straight into its own existing `ChartTitleWithToggle` call
// via a new `dragHandle` prop, same one-line addition in every file.
function SortableDashboardSection({
  id,
  position,
  isReordering,
  children,
}: {
  id: DashboardChartKey
  position: number
  isReordering: boolean
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled: !isReordering })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const dragHandle = isReordering ? (
    <button
      type="button"
      aria-label={t.dashboard.reorderSectionLabel(position)}
      className="w-fit shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  ) : null

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  )
}

export function DashboardScreen() {
  const t = useTranslation()
  const { goal, entries, goalTrackingStartDate, status } = useDashboardData()
  // #380 — one global period control, originally scoped to just the 4 main
  // trend charts below; #396 extended it to every Dashboard section that
  // reads `entries` — see DashboardPeriodPicker's own doc comment for the
  // scope-reversal reasoning.
  const trendChartPeriod = useDashboardPeriodStore((state) => state.period)
  const trendChartCustomStart = useDashboardPeriodStore(
    (state) => state.customStart,
  )
  const trendChartCustomEnd = useDashboardPeriodStore(
    (state) => state.customEnd,
  )
  const periodFilteredEntries = filterEntriesByTrendChartPeriod(
    entries,
    resolveTrendChartPeriodRange(
      trendChartPeriod,
      trendChartCustomStart,
      trendChartCustomEnd,
    ),
  )
  const order = useDashboardSectionOrderStore((state) => state.order)
  const setOrder = useDashboardSectionOrderStore((state) => state.setOrder)
  const resetOrder = useDashboardSectionOrderStore((state) => state.resetOrder)
  // #359 — reported live: the Reset order button stayed enabled even when
  // the order already matched the default, so clicking it did nothing
  // visible and the user kept tapping.
  const isDefaultOrder = order.every(
    (key, i) => key === DEFAULT_DASHBOARD_SECTION_ORDER[i],
  )
  // #336 — user-defined correlations, rendered after the fixed reorderable
  // sections below (see CustomCorrelationView's own doc comment for why
  // they're not part of that reorderable list).
  const customMetrics = useCustomMetricStore((state) => state.metrics)
  const customMetricEntries = useCustomMetricStore((state) => state.entries)
  const loadCustomMetrics = useCustomMetricStore((state) => state.loadAll)
  const customCorrelations = useCustomCorrelationStore(
    (state) => state.correlations,
  )
  const loadCustomCorrelations = useCustomCorrelationStore(
    (state) => state.loadCorrelations,
  )
  useEffect(() => {
    loadCustomMetrics()
    loadCustomCorrelations()
  }, [loadCustomMetrics, loadCustomCorrelations])
  // #319 — reordering is now an on-demand mode (an "Edit"-style toggle up
  // top) rather than always-on drag handles cluttering every section. The
  // order itself still autosaves per drop exactly as #297 already did —
  // this button doesn't defer/stage anything, it only shows/hides the
  // handles; by the time it's clicked to exit, whatever order resulted
  // from any drags made while it was open is already persisted.
  const [isReordering, setIsReordering] = useState(false)
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id as DashboardChartKey)
    const newIndex = order.indexOf(over.id as DashboardChartKey)
    setOrder(arrayMove(order, oldIndex, newIndex))
  }

  // #355 — each entry is a render-prop function (not a plain element) so
  // `SortableDashboardSection` can hand every section its own drag-handle
  // element to forward into its own `ChartTitleWithToggle` call, instead of
  // rendering the handle itself above the section.
  const sectionsByKey: Record<
    DashboardChartKey,
    (dragHandle: ReactNode) => ReactNode
  > = {
    weight: (dragHandle) => (
      <WeightTrendChart
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    calories: (dragHandle) => (
      <CalorieTrendChart
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    macros: (dragHandle) => (
      <MacroTrendChart
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    bodyComposition: (dragHandle) => (
      <BodyCompositionTrendChart
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    // #396 — extended the trend-chart-only period picker (#380) to every
    // correlation view plus this chart, on the user's own explicit choice
    // to accept the smaller-sample trade-off for correlations too.
    customChart: (dragHandle) => (
      <CustomChartView entries={periodFilteredEntries} dragHandle={dragHandle} />
    ),
    calorieWeightCorrelation: (dragHandle) => (
      <CorrelationView entries={periodFilteredEntries} dragHandle={dragHandle} />
    ),
    lateMealCorrelation: (dragHandle) => (
      <LateMealCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    mealFrequencyCorrelation: (dragHandle) => (
      <MealFrequencyCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    fastingWindowCorrelation: (dragHandle) => (
      <FastingWindowCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    sleepCorrelation: (dragHandle) => (
      <SleepCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    stepsCorrelation: (dragHandle) => (
      <StepsCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    proteinCorrelation: (dragHandle) => (
      <ProteinCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    nightEatingCorrelation: (dragHandle) => (
      <NightEatingCorrelationView
        entries={periodFilteredEntries}
        dragHandle={dragHandle}
      />
    ),
    foodReactions: (dragHandle) => (
      <FoodReactionsView entries={entries} dragHandle={dragHandle} />
    ),
    loggingConsistency: (dragHandle) => (
      <LoggingConsistencyHeatmap entries={entries} dragHandle={dragHandle} />
    ),
    recentAverages: (dragHandle) => (
      <RecentAveragesCards entries={entries} dragHandle={dragHandle} />
    ),
    weeklySummary: (dragHandle) => (
      <WeeklySummaryCards
        entries={entries}
        goal={goal}
        goalTrackingStartDate={goalTrackingStartDate}
        dragHandle={dragHandle}
      />
    ),
    monthlySummary: (dragHandle) => (
      <MonthlySummaryCards entries={entries} dragHandle={dragHandle} />
    ),
    compareRanges: (dragHandle) => (
      <CompareRangesView entries={entries} dragHandle={dragHandle} />
    ),
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.description}
        action={
          status !== 'loading' &&
          status !== 'idle' &&
          entries.length > 0 && (
            <div className="flex items-center gap-2">
              {isReordering && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDefaultOrder}
                  onClick={resetOrder}
                >
                  {t.dashboard.resetSectionOrderButton}
                </Button>
              )}
              <Button
                type="button"
                variant={isReordering ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsReordering((prev) => !prev)}
              >
                {isReordering ? (
                  t.dailyEntry.saveButton
                ) : (
                  <>
                    <Pencil aria-hidden="true" />
                    {t.dashboard.reorderSectionsButton}
                  </>
                )}
              </Button>
            </div>
          )
        }
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
          <DashboardPeriodPicker />
          <DndContext
            sensors={dragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={order}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-6">
                {order.map((key, index) => (
                  <SortableDashboardSection
                    key={key}
                    id={key}
                    position={index + 1}
                    isReordering={isReordering}
                  >
                    {(dragHandle) => sectionsByKey[key](dragHandle)}
                  </SortableDashboardSection>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* #336 — one card per user-defined correlation, after every fixed
       * built-in section above, plus a standing link into
       * `CustomMetricsScreen.tsx` (always shown once entries have loaded,
       * not just when a correlation already exists — otherwise this
       * feature would have no discoverable entry point on Dashboard at
       * all until a user already knew to look in Settings). */}
      {status !== 'loading' && status !== 'idle' && entries.length > 0 && (
        <div className="mt-6 flex flex-col gap-6">
          {customCorrelations.map((correlation) => (
            <CustomCorrelationView
              key={correlation.id}
              correlation={correlation}
              entries={entries}
              metrics={customMetrics}
              metricEntries={customMetricEntries}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            asChild
          >
            <Link to="/settings/custom-metrics">
              {t.dashboard.manageCustomCorrelationsLabel}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
