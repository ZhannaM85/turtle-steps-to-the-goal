import type { DailyEntry, MealEmotion } from '@/domain/dailyEntry'
import { mostDislikedFoods, mostLikedFoods } from '@/domain/stats'
import type { FoodReactionTally } from '@/domain/stats'
import { useTranslation, type Dictionary } from '@/i18n'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'

export interface FoodReactionsViewProps {
  entries: DailyEntry[]
}

function ReactionCounts({
  food,
  t,
}: {
  food: FoodReactionTally
  t: Dictionary
}) {
  const counts: [MealEmotion, number][] = []
  if (food.bellissimoCount > 0) counts.push(['bellissimo', food.bellissimoCount])
  if (food.thumbsUpCount > 0) counts.push(['thumbsUp', food.thumbsUpCount])
  if (food.thumbsDownCount > 0) counts.push(['thumbsDown', food.thumbsDownCount])

  return (
    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
      {counts.map(([emotion, count]) => {
        const emoji = MEAL_EMOTIONS.find((e) => e.value === emotion)?.emoji
        return (
          <span key={emotion}>
            <span aria-hidden="true">
              {emoji} {count}
            </span>
            <span className="sr-only">
              {t.dailyEntry.mealEmotionLabel(emotion)} × {count}
            </span>
          </span>
        )
      })}
    </span>
  )
}

function FoodList({
  title,
  foods,
  t,
}: {
  title: string
  foods: FoodReactionTally[]
  t: Dictionary
}) {
  if (foods.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {foods.map((food) => (
          <li
            key={food.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="truncate">{food.name}</span>
            <ReactionCounts food={food} t={t} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Which dishes tend to get a good vs. bad reaction (#128), built directly on
 * #129's per-item `emotion` — before that, a meal's reaction was one shared
 * value for the whole group, so a multi-item meal (e.g. pizza + milk) had no
 * way to attribute it to one dish over another. Renders nothing at all when
 * no item has ever been logged with a reaction, same "nothing to show yet"
 * treatment as `LateMealCorrelationView`'s empty case — no minimum-data gate
 * beyond that, since this is a plain tally, not a statistical inference that
 * needs enough points to be meaningful.
 */
export function FoodReactionsView({ entries }: FoodReactionsViewProps) {
  const t = useTranslation()
  const liked = mostLikedFoods(entries)
  const disliked = mostDislikedFoods(entries)

  if (liked.length === 0 && disliked.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.foodReactionsTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FoodList title={t.dashboard.mostLikedFoodsTitle} foods={liked} t={t} />
        <FoodList
          title={t.dashboard.mostDislikedFoodsTitle}
          foods={disliked}
          t={t}
        />
      </div>
    </div>
  )
}
