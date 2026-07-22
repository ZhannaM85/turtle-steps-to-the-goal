import type { MealItem } from './MealItem'

export interface MealItemRepository {
  getAll(): Promise<MealItem[]>
  findByName(name: string): Promise<MealItem | undefined>
  /** #256 — the local-first lookup a barcode scan checks before ever
   * falling back to an Open Food Facts fetch. */
  findByBarcode(barcode: string): Promise<MealItem | undefined>
  upsert(item: MealItem): Promise<void>
  delete(id: string): Promise<void>
}
