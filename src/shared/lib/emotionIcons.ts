import { Frown, Meh, Smile, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react'
import type { Emotion, MealEmotion } from '@/domain/dailyEntry'

/** The day's overall mood (#44) — unchanged by #54. */
export const DAY_EMOTIONS: { value: Emotion; Icon: LucideIcon }[] = [
  { value: 'happy', Icon: Smile },
  { value: 'neutral', Icon: Meh },
  { value: 'unhappy', Icon: Frown },
]

/**
 * A single meal's reaction (#54). lucide-react has no pinched-fingers /
 * chef's-kiss icon, so "bellissimo" renders as the 🤌 emoji literal instead
 * of a LucideIcon — the only entry here without one.
 */
export const MEAL_EMOTIONS: {
  value: MealEmotion
  Icon?: LucideIcon
  emoji?: string
}[] = [
  { value: 'thumbsUp', Icon: ThumbsUp },
  { value: 'thumbsDown', Icon: ThumbsDown },
  { value: 'bellissimo', emoji: '🤌' },
]
