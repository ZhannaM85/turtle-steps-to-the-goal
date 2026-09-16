import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, Share2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SendDaySnippetDialog } from '@/features/local-transfer/SendDaySnippetDialog'
import { CustomMetricLogSection } from '@/features/custom-metrics'
import { goalWeekEnd, goalWindowConcluded, goalWindowHasEnded } from '@/domain/goal'
import { effectiveDateFor } from '@/domain/stats'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import {
  useActiveGoalProgress,
  useGoalCoveringDate,
  useLatestWeight,
  useMaxRecordedWeight,
  usePreviousDayEntry,
} from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { PageHeader } from '@/shared/ui/page-header'
import { pageStickyUnderAppHeader } from '@/shared/ui/pageSticky'
import {
  useDailyEntryStore,
  useDailyReminderStore,
  useDayStartStore,
  useGoalStore,
  useLocalTransferStore,
  usePlannedMealStore,
} from '@/stores'
import { DailyEntryFormBottom } from './DailyEntryFormBottom'
import { DailyEntryFormMorning } from './DailyEntryFormMorning'
import { DailyEntryFormNextMorningWeight } from './DailyEntryFormNextMorningWeight'
import { CompleteDayProjectionDialog } from './CompleteDayProjectionDialog'
import { DailyEntryFormNightFood } from './DailyEntryFormNightFood'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { DailyEntryFormTop } from './DailyEntryFormTop'
import { DaySectionsCollapseControl } from './DaySectionsCollapseControl'
import { GoalCelebrationModal } from './GoalCelebrationModal'
import { TodayDateNav } from './TodayDateNav'
import { TodayInsightBanners } from './TodayInsightBanners'
import { TodayStatsSection } from './TodayStatsSection'
import { TodayWeeklyTarget } from './TodayWeeklyTarget'
import { shiftDate } from './todayScreenUtils'
import { useTodayDayStats } from './useTodayDayStats'

export function TodayScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const {
    entry,
    status: entryStatus,
    loadEntry,
    saveEntry,
  } = useDailyEntryStore()
  const localTransferEnabled = useLocalTransferStore((state) => state.enabled)
  const [sendDayOpen, setSendDayOpen] = useState(false)
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const startedEarlyForDate = useDayStartStore(
    (state) => state.startedEarlyForDate,
  )
  const startTodayEarly = useDayStartStore((state) => state.startTodayEarly)
  const realTodayIso = format(new Date(), 'yyyy-MM-dd')
  function todayIso() {
    if (startedEarlyForDate === realTodayIso) return realTodayIso
    return format(effectiveDateFor(new Date(), dayStartTime), 'yyyy-MM-dd')
  }
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? todayIso()
  const pendingScrollYRef = useRef<number | null>(null)
  const formAreaRef = useRef<HTMLDivElement>(null)
  const [loadingMinHeight, setLoadingMinHeight] = useState<number | undefined>()
  function setDate(next: string | ((prev: string) => string)) {
    const nextDate = typeof next === 'function' ? next(date) : next
    pendingScrollYRef.current = window.scrollY
    setSearchParams(
      nextDate === todayIso() ? {} : { date: nextDate },
      { replace: true },
    )
  }
  const debug465 = searchParams.get('debug') === '465'
  const debug465PrevRef = useRef<HTMLButtonElement>(null)
  const debug465DateRef = useRef<HTMLInputElement>(null)
  const debug465NextRef = useRef<HTMLButtonElement>(null)
  const debug465TodayRef = useRef<HTMLButtonElement>(null)
  const [debug465Sizes, setDebug420Sizes] = useState<
    Record<
      'prev' | 'date' | 'next' | 'today',
      { width: number; height: number } | null
    >
  >({ prev: null, date: null, next: null, today: null })

  const previousDayEntry = usePreviousDayEntry(date)
  const maxWeightKg = useMaxRecordedWeight(entry)
  const plannedMeals = usePlannedMealStore((state) => state.plannedMeals)
  const loadPlannedMeals = usePlannedMealStore((state) => state.loadAll)
  useEffect(() => {
    loadPlannedMeals()
  }, [loadPlannedMeals])
  const furthestPlannedMealDate = plannedMeals.reduce<string | undefined>(
    (max, meal) => (max === undefined || meal.date > max ? meal.date : max),
    undefined,
  )
  const tomorrowIso = shiftDate(todayIso(), 1)
  const maxNavigableDate =
    furthestPlannedMealDate !== undefined &&
    furthestPlannedMealDate > tomorrowIso
      ? furthestPlannedMealDate
      : tomorrowIso
  const activeGoalProgress = useActiveGoalProgress()
  const showTargetMetBanner =
    activeGoalProgress?.targetMet === true &&
    !goalWindowConcluded(activeGoalProgress)
  const targetMetBannerWeekEndLabel = activeGoalProgress
    ? format(parseISO(activeGoalProgress.weekEnd), 'PP', {
        locale: dateFnsLocale,
      })
    : null
  const { goal: dayGoal, progress: dayGoalProgress } = useGoalCoveringDate(date)
  const latestWeightKg = useLatestWeight(dayGoal)

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    loadEntry(date)
  }, [date, loadEntry])

  useLayoutEffect(() => {
    if (entryStatus === 'loading' || entryStatus === 'idle') return
    const el = formAreaRef.current
    if (el) setLoadingMinHeight(el.offsetHeight)
    const y = pendingScrollYRef.current
    if (y === null) return
    pendingScrollYRef.current = null
    window.scrollTo(0, y)
  }, [entryStatus, date, entry])

  useEffect(() => {
    if (!debug465) return
    const targets: Array<[keyof typeof debug465Sizes, HTMLElement | null]> = [
      ['prev', debug465PrevRef.current],
      ['date', debug465DateRef.current],
      ['next', debug465NextRef.current],
      ['today', debug465TodayRef.current],
    ]
    const observer = new ResizeObserver(() => {
      setDebug420Sizes((prev) => {
        const next = { ...prev }
        for (const [key, el] of targets) {
          if (el) {
            const rect = el.getBoundingClientRect()
            next[key] = { width: rect.width, height: rect.height }
          }
        }
        return next
      })
    })
    for (const [, el] of targets) {
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [debug465, date])

  const stats = useTodayDayStats({
    entry,
    goal,
    previousDayEntry,
    maxWeightKg,
  })
  const weeklyPace = dayGoal ? stats.toDisplay(dayGoal.targetWeeklyLossKg) : null
  const showGoalRenewalReminder = Boolean(
    goal &&
      goal.weekStart &&
      goalWindowHasEnded(goal.weekEnd ?? goalWeekEnd(goal.weekStart)),
  )
  const dailyReminderEnabled = useDailyReminderStore((state) => state.enabled)
  const showDailyReminder =
    dailyReminderEnabled &&
    date === todayIso() &&
    entryStatus === 'ready' &&
    entry === null

  return (
    <div className="flex flex-col gap-6">
      <GoalCelebrationModal />
      <div
        className={pageStickyUnderAppHeader(
          'flex flex-col gap-1.5 pt-1 pb-2',
        )}
        data-slot="day-intro"
      >
        <PageHeader
          title={t.today.title}
          titleAccessory={
            entry !== null ? (
              <InfoTooltip
                text={t.today.dayHasEntriesLabel}
                label={t.today.dayHasEntriesLabel}
                className="size-auto shrink-0 rounded-full bg-primary/15 p-1 text-primary hover:text-primary"
                icon={<Check aria-hidden="true" className="size-3.5" />}
              />
            ) : undefined
          }
          overlayAction
          action={
            localTransferEnabled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xl"
                aria-label={t.today.sendDayLogLabel}
                onClick={() => setSendDayOpen(true)}
              >
                <Share2 aria-hidden="true" />
              </Button>
            ) : undefined
          }
        />
        <TodayDateNav
          date={date}
          todayIso={todayIso()}
          realTodayIso={realTodayIso}
          maxNavigableDate={maxNavigableDate}
          onSetDate={setDate}
          onStartTodayEarly={(realToday) => {
            startTodayEarly(realToday)
            setDate(realToday)
          }}
          debug465={debug465}
          debug465Sizes={debug465Sizes}
          debug465PrevRef={debug465PrevRef}
          debug465DateRef={debug465DateRef}
          debug465NextRef={debug465NextRef}
          debug465TodayRef={debug465TodayRef}
        />
      </div>
      <SendDaySnippetDialog
        open={sendDayOpen}
        onOpenChange={setSendDayOpen}
        date={date}
        entry={entry}
      />
      <TodayWeeklyTarget
        goalStatus={goalStatus}
        goal={goal}
        dayGoal={dayGoal}
        dayGoalProgress={dayGoalProgress}
        weeklyPace={weeklyPace}
        latestWeightKg={latestWeightKg}
        displayUnit={stats.displayUnit}
        toDisplay={stats.toDisplay}
      />
      {entryStatus === 'loading' || entryStatus === 'idle' ? (
        <p
          className="text-sm text-muted-foreground"
          style={
            loadingMinHeight != null
              ? { minHeight: loadingMinHeight }
              : undefined
          }
        >
          {t.common.loading}
        </p>
      ) : (
        <div ref={formAreaRef} className="flex flex-col gap-6">
          <DailyEntryFormStateProvider
            key={date}
            date={date}
            existingEntry={entry}
            onSave={saveEntry}
          >
            <div className="flex flex-col gap-1.5">
              <DaySectionsCollapseControl />
              <DailyEntryFormMorning />
            </div>
            <TodayStatsSection stats={stats} goal={goal} />
            <TodayInsightBanners
              showTargetMetBanner={showTargetMetBanner}
              targetMetBannerWeekEndLabel={targetMetBannerWeekEndLabel}
              showGoalRenewalReminder={showGoalRenewalReminder}
              showDailyReminder={showDailyReminder}
              showNutritionFacts={stats.showNutritionFacts}
              nutritionFacts={stats.nutritionFacts}
            />
            <DailyEntryFormTop />
            <CustomMetricLogSection date={date} />
            <DailyEntryFormBottom />
            <DailyEntryFormNightFood />
            <DailyEntryFormNextMorningWeight />
            <CompleteDayProjectionDialog />
          </DailyEntryFormStateProvider>
        </div>
      )}
    </div>
  )
}
