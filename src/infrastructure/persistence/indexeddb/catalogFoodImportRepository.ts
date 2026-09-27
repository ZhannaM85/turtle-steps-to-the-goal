import type { CatalogFoodImport } from '@/domain/catalogFoodImport'
import { db } from './db'

export class IndexedDbCatalogFoodImportRepository {
  getAll(): Promise<CatalogFoodImport[]> {
    return db.catalogFoodImports.toArray()
  }

  async upsert(row: CatalogFoodImport): Promise<void> {
    await db.catalogFoodImports.put(row)
  }

  async delete(nameRu: string): Promise<void> {
    await db.catalogFoodImports.delete(nameRu)
  }
}
