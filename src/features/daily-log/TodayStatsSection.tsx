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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import {
  formatNumber,
  unitLabel,
  useTranslation,
} from '@/i18n'
import { formatKcal, formatMacroGrams, formatMl } from '@/shared/lib/macroDisplay'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { SectionAccordion } from '@/shared/ui/section-accordion'
import { StatCard } from '@/shared/ui/stat-card'
import {
  DEFAULT_TODAY_CARD_ORDER,
  useMicronutrientTrackingStore,
  useTodayCardOrderStore,
  useTodaySectionsCollapseStore,
  useTrackedFieldsStore,
  type TodayCardKey,
} from '@/stores'
import { TodaySortableCard } from './TodaySortableCard'
import type { TodayDayStats } from './useTodayDayStats'
import { useTodaySectionChrome } from './useTodaySectionChrome'

export function TodayStatsSection({
  stats,
  goal,
}: {
  stats: TodayDayStats
  goal: Goal | null
}) {
  const t = useTranslation()
  const { locale, displayUnit } = stats
  const { sectionVisible, sectionTitle, statCardAction } =
    useTodaySectionChrome()
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const cardOrder = useTodayCardOrderStore((state) => state.order)
  const setCardOrder = useTodayCardOrderStore((state) => state.setOrder)
  const resetCardOrder = useTodayCardOrderStore((state) => state.resetOrder)
  const statsCollapsed = useTodaySectionsCollapseStore(
    (state) => state.sections.stats,
  )
  const setStatsCollapsed = useTodaySectionsCollapseStore(
    (state) => state.setCollapsed,
  )
  const isDefaultCardOrder = cardOrder.every(
    (key, i) => key === DEFAULT_TODAY_CARD_ORDER[i],
  )
  const [isReorderingCards, setIsReorderingCards] = useState(false)
  const cardDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleCardDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cardOrder.indexOf(active.id as TodayCardKey)
    const newIndex = cardOrder.indexOf(over.id as TodayCardKey)
    setCardOrder(arrayMove(cardOrder, oldIndex, newIndex))
  }

  const cardsByKey: Record<TodayCardKey, ReactNode> = {
    remainingCalories:
      stats.remainingKcal !== null &&
      (sectionVisible.todayRemainingCalories ? (
        <StatCard
          label={t.today.remainingCaloriesLabel}
          value={formatNumber(Math.abs(stats.remainingKcal), locale, 0)}
          unit={
            stats.isOverCalorieBudget
              ? t.today.kcalOverUnit
              : t.today.kcalRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            formatKcal(goal!.dailyCalorieTargetKcal!, locale, t),
            formatKcal(stats.consumedKcal, locale, t),
          )}
          progressPercent={stats.caloriesPercent ?? undefined}
          progressColor="var(--chart-calories)"
          action={
            <span className="flex items-center gap-1">
              {stats.bmrValue !== null && (
                <InfoTooltip
                  text={`${t.today.bmrLabel}: ${formatNumber(stats.bmrValue, locale, 0)} ${t.today.bmrUnit}`}
                  label={t.today.bmrTooltipLabel}
                />
              )}
              {statCardAction(
                'todayRemainingCalories',
                t.today.remainingCaloriesLabel,
              )}
            </span>
          }
        />
      ) : (
        sectionTitle('todayRemainingCalories', t.today.remainingCaloriesLabel)
      )),
    remainingProtein:
      stats.proteinDeltaG !== null &&
      (sectionVisible.todayRemainingProtein ? (
        <StatCard
          label={t.today.remainingProteinLabel}
          value={formatNumber(Math.abs(stats.proteinDeltaG), locale, 0)}
          unit={
            stats.isOverProteinTarget
              ? t.today.gOverUnit
              : t.today.gRemainingUnit
          }
          description={
            stats.isOverProteinTarget
              ? t.today.proteinOverTargetLabel(
                  stats.proteinTargetText!,
                  formatMacroGrams(stats.consumedProteinG, locale, t),
                )
              : t.today.targetMinusConsumedText(
                  stats.proteinTargetText!,
                  formatMacroGrams(stats.consumedProteinG, locale, t),
                )
          }
          progressPercent={stats.proteinPercent ?? undefined}
          progressColor="var(--stat-protein)"
          action={statCardAction(
            'todayRemainingProtein',
            t.today.remainingProteinLabel,
          )}
        />
      ) : (
        sectionTitle('todayRemainingProtein', t.today.remainingProteinLabel)
      )),
    remainingFat:
      stats.fatDeltaG !== null &&
      (sectionVisible.todayRemainingFat ? (
        <StatCard
          label={t.today.remainingFatLabel}
          value={formatNumber(Math.abs(stats.fatDeltaG), locale, 0)}
          unit={
            stats.isOverFatTarget ? t.today.gOverUnit : t.today.gRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.fatTargetText!,
            formatMacroGrams(stats.consumedFatG, locale, t),
          )}
          progressPercent={stats.fatPercent ?? undefined}
          progressColor="var(--stat-fat)"
          action={statCardAction('todayRemainingFat', t.today.remainingFatLabel)}
        />
      ) : (
        sectionTitle('todayRemainingFat', t.today.remainingFatLabel)
      )),
    remainingCarbs:
      stats.carbDeltaG !== null &&
      (sectionVisible.todayRemainingCarbs ? (
        <StatCard
          label={t.today.remainingCarbLabel}
          value={formatNumber(Math.abs(stats.carbDeltaG), locale, 0)}
          unit={
            stats.isOverCarbTarget ? t.today.gOverUnit : t.today.gRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.carbTargetText!,
            formatMacroGrams(stats.consumedCarbG, locale, t),
          )}
          progressPercent={stats.carbPercent ?? undefined}
          progressColor="var(--stat-carbs)"
          action={statCardAction(
            'todayRemainingCarbs',
            t.today.remainingCarbLabel,
          )}
        />
      ) : (
        sectionTitle('todayRemainingCarbs', t.today.remainingCarbLabel)
      )),
    remainingFiber:
      trackedFields.fiber &&
      stats.fiberDeltaG !== null &&
      (sectionVisible.todayRemainingFiber ? (
        <StatCard
          label={t.today.remainingFiberLabel}
          value={formatNumber(Math.abs(stats.fiberDeltaG), locale, 0)}
          unit={
            stats.isOverFiberTarget ? t.today.gOverUnit : t.today.gRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.fiberTargetText!,
            formatMacroGrams(stats.consumedFiberG, locale, t),
          )}
          progressPercent={stats.fiberPercent ?? undefined}
          progressColor="var(--stat-fiber)"
          action={statCardAction(
            'todayRemainingFiber',
            t.today.remainingFiberLabel,
          )}
        />
      ) : (
        sectionTitle('todayRemainingFiber', t.today.remainingFiberLabel)
      )),
    remainingSodium:
      micronutrients.sodium &&
      stats.sodiumDeltaMg !== null &&
      (sectionVisible.todayRemainingSodium ? (
        <StatCard
          label={t.today.remainingSodiumLabel}
          value={formatNumber(Math.abs(stats.sodiumDeltaMg), locale, 0)}
          unit={
            stats.isOverSodiumTarget
              ? t.today.mgOverUnit
              : t.today.mgRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.sodiumTargetText!,
            stats.formatMgAmount(stats.consumedSodiumMg),
          )}
          progressPercent={stats.sodiumPercent ?? undefined}
          progressColor="var(--stat-sodium)"
          action={statCardAction(
            'todayRemainingSodium',
            t.today.remainingSodiumLabel,
          )}
        />
      ) : (
        sectionTitle('todayRemainingSodium', t.today.remainingSodiumLabel)
      )),
    remainingPotassium:
      micronutrients.potassium &&
      stats.potassiumDeltaMg !== null &&
      (sectionVisible.todayRemainingPotassium ? (
        <StatCard
          label={t.today.remainingPotassiumLabel}
          value={formatNumber(Math.abs(stats.potassiumDeltaMg), locale, 0)}
          unit={
            stats.isOverPotassiumTarget
              ? t.today.mgOverUnit
              : t.today.mgRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.potassiumTargetText!,
            stats.formatMgAmount(stats.consumedPotassiumMg),
          )}
          progressPercent={stats.potassiumPercent ?? undefined}
          progressColor="var(--stat-potassium)"
          action={statCardAction(
            'todayRemainingPotassium',
            t.today.remainingPotassiumLabel,
          )}
        />
      ) : (
        sectionTitle(
          'todayRemainingPotassium',
          t.today.remainingPotassiumLabel,
        )
      )),
    remainingMagnesium:
      micronutrients.magnesium &&
      stats.magnesiumDeltaMg !== null &&
      (sectionVisible.todayRemainingMagnesium ? (
        <StatCard
          label={t.today.remainingMagnesiumLabel}
          value={formatNumber(Math.abs(stats.magnesiumDeltaMg), locale, 0)}
          unit={
            stats.isOverMagnesiumTarget
              ? t.today.mgOverUnit
              : t.today.mgRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.magnesiumTargetText!,
            stats.formatMgAmount(stats.consumedMagnesiumMg),
          )}
          progressPercent={stats.magnesiumPercent ?? undefined}
          progressColor="var(--stat-magnesium)"
          action={statCardAction(
            'todayRemainingMagnesium',
            t.today.remainingMagnesiumLabel,
          )}
        />
      ) : (
        sectionTitle(
          'todayRemainingMagnesium',
          t.today.remainingMagnesiumLabel,
        )
      )),
    remainingWater:
      stats.waterDeltaMl !== null &&
      (sectionVisible.todayRemainingWater ? (
        <StatCard
          label={t.today.remainingWaterLabel}
          value={formatNumber(Math.abs(stats.waterDeltaMl), locale, 0)}
          unit={
            stats.isOverWaterTarget
              ? t.today.mlOverUnit
              : t.today.mlRemainingUnit
          }
          description={t.today.targetMinusConsumedText(
            stats.waterTargetText!,
            formatMl(stats.consumedWaterMl, locale, t),
          )}
          progressPercent={stats.waterPercent ?? undefined}
          progressColor="var(--stat-water)"
          action={statCardAction(
            'todayRemainingWater',
            t.today.remainingWaterLabel,
          )}
          onClick={() => {
            document
              .getElementById('water-entry-section')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      ) : (
        sectionTitle('todayRemainingWater', t.today.remainingWaterLabel)
      )),
    steps:
      stats.stepsValue !== undefined &&
      (sectionVisible.todaySteps ? (
        <StatCard
          label={t.dailyEntry.stepsLabel}
          value={formatNumber(stats.stepsValue, locale, 0)}
          action={statCardAction('todaySteps', t.dailyEntry.stepsLabel)}
        />
      ) : (
        sectionTitle('todaySteps', t.dailyEntry.stepsLabel)
      )),
    sleep:
      stats.sleepValue !== undefined &&
      (sectionVisible.todaySleep ? (
        <StatCard
          label={t.dailyEntry.sleepLabel}
          value={formatSleepDuration(
            stats.sleepValue,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          )}
          description={
            stats.deepSleepValue === undefined
              ? undefined
              : t.today.deepSleepDescription(
                  formatSleepDuration(
                    stats.deepSleepValue,
                    t.dailyEntry.hoursUnit,
                    t.dailyEntry.minutesUnit,
                  ),
                )
          }
          action={statCardAction('todaySleep', t.dailyEntry.sleepLabel)}
        />
      ) : (
        sectionTitle('todaySleep', t.dailyEntry.sleepLabel)
      )),
  }

  return (
    <SectionAccordion
      open={!statsCollapsed}
      onOpenChange={(open) => setStatsCollapsed('stats', !open)}
      title={t.today.statsSectionLabel}
      expandLabel={t.today.expandStatsLabel}
      collapseLabel={t.today.collapseStatsLabel}
      shell={false}
      contentClassName="flex flex-col gap-6 pt-3"
      actions={
        cardOrder.some((key) => cardsByKey[key]) ? (
          <div className="flex items-center justify-end gap-2">
            {isReorderingCards && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDefaultCardOrder}
                onClick={resetCardOrder}
              >
                {t.today.resetCardOrderButton}
              </Button>
            )}
            <Button
              type="button"
              variant={isReorderingCards ? 'default' : 'outline'}
              size={isReorderingCards ? 'sm' : 'icon-sm'}
              aria-label={
                isReorderingCards ? undefined : t.today.reorderCardsButton
              }
              onClick={() =>
                setIsReorderingCards((prev) => {
                  const next = !prev
                  if (next) setStatsCollapsed('stats', false)
                  return next
                })
              }
            >
              {isReorderingCards ? (
                t.dailyEntry.saveButton
              ) : (
                <GripVertical aria-hidden="true" className="size-4" />
              )}
            </Button>
          </div>
        ) : undefined
      }
    >
      {stats.bmiValue !== null &&
        (sectionVisible.todayBmi ? (
          <StatCard
            label={t.today.bmiLabel}
            value={formatNumber(stats.bmiValue, locale, 1)}
            action={statCardAction('todayBmi', t.today.bmiLabel)}
          />
        ) : (
          sectionTitle('todayBmi', t.today.bmiLabel)
        ))}
      {stats.weightDeltaValue !== null &&
        (sectionVisible.todayVsYesterday ? (
          <StatCard
            label={t.today.vsYesterdayLabel}
            value={stats.weightDeltaValue}
            unit={unitLabel(displayUnit, t)}
            action={statCardAction(
              'todayVsYesterday',
              t.today.vsYesterdayLabel,
            )}
          />
        ) : (
          sectionTitle('todayVsYesterday', t.today.vsYesterdayLabel)
        ))}
      {stats.vsMaxWeightValue !== null &&
        (sectionVisible.todayVsMaxWeight ? (
          <StatCard
            label={t.today.vsMaxWeightLabel}
            value={stats.vsMaxWeightValue}
            unit={unitLabel(displayUnit, t)}
            action={statCardAction('todayVsMaxWeight', t.today.vsMaxWeightLabel)}
          />
        ) : (
          sectionTitle('todayVsMaxWeight', t.today.vsMaxWeightLabel)
        ))}
      <DndContext
        sensors={cardDragSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCardDragEnd}
      >
        <SortableContext
          items={cardOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-6">
            {cardOrder.map((key, index) =>
              cardsByKey[key] ? (
                <TodaySortableCard
                  key={key}
                  id={key}
                  position={index + 1}
                  isReordering={isReorderingCards}
                >
                  {cardsByKey[key]}
                </TodaySortableCard>
              ) : null,
            )}
          </div>
        </SortableContext>
      </DndContext>
    </SectionAccordion>
  )
}
