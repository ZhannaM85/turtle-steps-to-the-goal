import type { DiaryLdlStamp } from '@/domain/cholesterol/restampDiaryLdl'
import { restampDiaryLdl } from '@/domain/cholesterol/restampDiaryLdl'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore } from './dailyEntryStore'

const dailyEntries = new IndexedDbDailyEntryRepository()

/** Save LDL restamps and refresh the day currently on screen. */
export async function persistDiaryLdlStamps(
  stamps: readonly DiaryLdlStamp[],
): Promise<void> {
  if (stamps.length === 0) return
  const entries = await dailyEntries.getAll()
  const { entriesToUpsert } = restampDiaryLdl(entries, stamps)
  for (const entry of entriesToUpsert) {
    await dailyEntries.upsert(entry)
  }
  const open = useDailyEntryStore.getState().entry
  if (!open) return
  const updated = entriesToUpsert.find((entry) => entry.id === open.id)
  if (updated) useDailyEntryStore.setState({ entry: updated })
}
