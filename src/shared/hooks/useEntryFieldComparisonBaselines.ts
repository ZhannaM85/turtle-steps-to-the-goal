import { useEffect, useMemo, useState } from 'react'
import type {
  ComparableEntryField,
  DailyEntry,
  FieldBaseline,
} from '@/domain/dailyEntry'
import {
  exactlyDaysBefore,
  findFieldValueOnDate,
  findMostRecentPriorFieldValue,
} from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export interface EntryFieldComparisonBaselines {
  prior: (field: ComparableEntryField) => FieldBaseline | null
  day30Value: (field: ComparableEntryField) => number | undefined
  day30Date: string
}

/**
 * Prior-day (or most-recent-prior) and exactly-30-days-ago baselines for
 * #664's field comparison indicators. Loads all entries once and derives
 * both lookups client-side — same getAll precedent as useMaxRecordedWeight.
 */
export function useEntryFieldComparisonBaselines(
  date: string,
): EntryFieldComparisonBaselines {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const day30Date = useMemo(() => exactlyDaysBefore(date, 30), [date])

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((result) => {
        if (!cancelled) setEntries(result)
      })
      .catch(() => {
        // Missing baselines just hide the indicator — same cosmetic-loss
        // precedent as usePreviousDayEntry.
      })
    return () => {
      cancelled = true
    }
  }, [date])

  return useMemo(
    () => ({
      prior: (field: ComparableEntryField) =>
        findMostRecentPriorFieldValue(entries, field, date),
      day30Value: (field: ComparableEntryField) =>
        findFieldValueOnDate(entries, field, day30Date),
      day30Date,
    }),
    [entries, date, day30Date],
  )
}
