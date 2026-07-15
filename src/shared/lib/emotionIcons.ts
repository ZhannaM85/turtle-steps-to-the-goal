import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react'
import type { Emotion, MealEmotion } from '@/domain/dailyEntry'

/** The day's overall mood (#44) — unchanged by #54. */
export const DAY_EMOTIONS: { value: Emotion; Icon: LucideIcon }[] = [
  { value: 'happy', Icon: Smile },
  { value: 'neutral', Icon: Meh },
  { value: 'unhappy', Icon: Frown },
]

/**
 * A single meal's reaction (#54). All three render as emoji, not lucide
 * icons — lucide-react's ThumbsUp/ThumbsDown were tried first (#54) but
 * mixing two monochrome line icons with bellissimo's 🤌 emoji (no lucide
 * equivalent exists) looked visually inconsistent side by side, so all
 * three switched to emoji instead (#64) for a consistent look within this
 * picker, even though it means these three no longer match the app's
 * lucide-icon system the way DAY_EMOTIONS still does.
 */
export const MEAL_EMOTIONS: {
  value: MealEmotion
  Icon?: LucideIcon
  emoji?: string
}[] = [
  { value: 'thumbsUp', emoji: '👍' },
  { value: 'thumbsDown', emoji: '👎' },
  { value: 'bellissimo', emoji: '🤌' },
]
