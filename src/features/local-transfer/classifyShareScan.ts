import { parseSharedFoodFromText } from '@/features/food-share/sharedFoodPayload'
import { parseDaySnippetFromText } from './daySnippetPayload'

export type ShareScanKind = 'day' | 'food' | 'invalid'

/** #723 — a QR may be a day snippet, a #661 food share, or junk. */
export function classifyShareScan(text: string): ShareScanKind {
  if (parseDaySnippetFromText(text)) return 'day'
  if (parseSharedFoodFromText(text)) return 'food'
  return 'invalid'
}
