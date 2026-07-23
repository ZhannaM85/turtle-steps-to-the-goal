import { useState, type ReactNode } from 'react'
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
import { useTranslation } from '@/i18n'
import type { DashboardChartKey } from '@/stores'
import { useDashboardSectionOrderStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { BodyCompositionTrendChart } from './BodyCompositionTrendChart'
import { CalorieTrendChart } from './CalorieTrendChart'
import { CompareRangesView } from './CompareRangesView'
import { CorrelationView } from './CorrelationView'
import { CustomChartView } from './CustomChartView'
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

// #297 — a thin drag-handle strip above each section rather than modifying
// every individual chart/card component's own internal title rendering
// (15+ files, each with a different title layout already established by
// #232/#245/#247's own show/hide toggle work) — purely additive at this
// level, consistent regardless of what a given section renders internally.
// #319 — the handle (and dragging itself) is now only shown/active while
// the page is in its on-demand reorder mode, rather than always visible;
// `disabled` on `useSortable` (same option `MealListItem` already uses for
// its own isEditing/isConfirmingDelete states) stops dnd-kit from treating
// the section as draggable at all outside that mode, not just hiding the
// handle visually.
function SortableDashboardSection({
  id,
  position,
  isReordering,
  children,
}: {
  id: DashboardChartKey
  position: number
  isReordering: boolean
  children: ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled: !isReordering })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-1">
      {isReordering && (
        <button
          type="button"
          aria-label={t.dashboard.reorderSectionLabel(position)}
          className="w-fit cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      {children}
    </div>
  )
}

export function DashboardScreen() {
  const t = useTranslation()
  const { goal, entries, status } = useDashboardData()
  const order = useDashboardSectionOrderStore((state) => state.order)
  const setOrder = useDashboardSectionOrderStore((state) => state.setOrder)
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

  const sectionsByKey: Record<DashboardChartKey, ReactNode> = {
    weight: <WeightTrendChart entries={entries} />,
    calories: <CalorieTrendChart entries={entries} />,
    macros: <MacroTrendChart entries={entries} />,
    bodyComposition: <BodyCompositionTrendChart entries={entries} />,
    customChart: <CustomChartView entries={entries} />,
    calorieWeightCorrelation: <CorrelationView entries={entries} />,
    lateMealCorrelation: <LateMealCorrelationView entries={entries} />,
    fastingWindowCorrelation: <FastingWindowCorrelationView entries={entries} />,
    sleepCorrelation: <SleepCorrelationView entries={entries} />,
    stepsCorrelation: <StepsCorrelationView entries={entries} />,
    proteinCorrelation: <ProteinCorrelationView entries={entries} />,
    foodReactions: <FoodReactionsView entries={entries} />,
    loggingConsistency: <LoggingConsistencyHeatmap entries={entries} />,
    recentAverages: <RecentAveragesCards entries={entries} />,
    weeklySummary: <WeeklySummaryCards entries={entries} goal={goal} />,
    monthlySummary: <MonthlySummaryCards entries={entries} />,
    compareRanges: <CompareRangesView entries={entries} />,
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
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-6">
              {order.map((key, index) => (
                <SortableDashboardSection
                  key={key}
                  id={key}
                  position={index + 1}
                  isReordering={isReordering}
                >
                  {sectionsByKey[key]}
                </SortableDashboardSection>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
