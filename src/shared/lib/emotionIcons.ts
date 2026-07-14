import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react'
import type { Emotion } from '@/domain/dailyEntry'

export const EMOTIONS: { value: Emotion; Icon: LucideIcon }[] = [
  { value: 'happy', Icon: Smile },
  { value: 'neutral', Icon: Meh },
  { value: 'unhappy', Icon: Frown },
]
