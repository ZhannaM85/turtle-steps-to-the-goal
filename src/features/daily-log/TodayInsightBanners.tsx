import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import type { NutritionFactId } from '@/domain/nutritionFacts'
import { useTodaySectionChrome } from './useTodaySectionChrome'

export function TodayInsightBanners({
  showTargetMetBanner,
  targetMetBannerWeekEndLabel,
  showGoalRenewalReminder,
  showDailyReminder,
  showNutritionFacts,
  nutritionFacts,
}: {
  showTargetMetBanner: boolean
  targetMetBannerWeekEndLabel: string | null
  showGoalRenewalReminder: boolean
  showDailyReminder: boolean
  showNutritionFacts: boolean
  nutritionFacts: NutritionFactId[]
}) {
  const t = useTranslation()
  const { sectionVisible, sectionTitle } = useTodaySectionChrome()

  return (
    <>
      {showTargetMetBanner && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle('todayTargetMetBanner', t.today.targetMetSectionTitle)}
          {sectionVisible.todayTargetMetBanner && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              <span>
                {targetMetBannerWeekEndLabel &&
                  t.today.targetMetBanner(targetMetBannerWeekEndLabel)}
              </span>
              <Link
                to="/goal"
                className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t.today.reviewGoalLink}
              </Link>
            </div>
          )}
        </div>
      )}
      {showGoalRenewalReminder && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle(
            'todayGoalRenewalReminder',
            t.today.goalRenewalReminderSectionTitle,
          )}
          {sectionVisible.todayGoalRenewalReminder && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              <span>{t.today.goalRenewalReminder}</span>
              <Link
                to="/goal"
                className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t.today.reviewGoalLink}
              </Link>
            </div>
          )}
        </div>
      )}
      {showDailyReminder && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle('todayDailyReminder', t.today.dailyReminderSectionTitle)}
          {sectionVisible.todayDailyReminder && (
            <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              {t.today.dailyReminderText}
            </div>
          )}
        </div>
      )}
      {showNutritionFacts && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle(
            'todayNutritionFacts',
            t.today.nutritionFactsSectionTitle,
          )}
          {sectionVisible.todayNutritionFacts && (
            <div className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              {nutritionFacts.map((factId) => (
                <span key={factId}>{t.nutritionFacts[factId]}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
