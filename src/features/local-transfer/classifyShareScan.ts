import { parseSharedFoodLinkFromText } from '@/features/food-share/sharedFoodBatchPayload'
import { parseDaySnippetFromText } from './daySnippetPayload'

export type ShareScanKind = 'day' | 'food' | 'invalid'

/** #723 — a QR may be a day snippet, a #661/#982 food share, or junk. */
export function classifyShareScan(text: string): ShareScanKind {
  if (parseDaySnippetFromText(text)) return 'day'
  if (parseSharedFoodLinkFromText(text)) return 'food'
  return 'invalid'
}
