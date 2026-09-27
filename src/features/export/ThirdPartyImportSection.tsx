import { useSettingsSearchQuery } from '@/features/settings/settingsSearchContext'
import { settingsRowVisible } from '@/features/settings/settingsSearch'
import { AppleHealthImportPanel } from './AppleHealthImportPanel'
import { MyFitnessPalImportPanel } from './MyFitnessPalImportPanel'
import { ZeppLifeImportPanel } from './ZeppLifeImportPanel'

/** #868 — Zepp / Apple Health / MyFitnessPal live next to JSON backup,
 * not inside `ExportSection`'s backup/analysis status machine. */
export function ThirdPartyImportSection() {
  const query = useSettingsSearchQuery()
  return (
    <>
      {settingsRowVisible('export', 'zepp', query) && <ZeppLifeImportPanel />}
      {settingsRowVisible('export', 'appleHealth', query) && (
        <AppleHealthImportPanel />
      )}
      {settingsRowVisible('export', 'myFitnessPal', query) && (
        <MyFitnessPalImportPanel />
      )}
    </>
  )
}
