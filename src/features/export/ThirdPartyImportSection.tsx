import { AppleHealthImportPanel } from './AppleHealthImportPanel'
import { MyFitnessPalImportPanel } from './MyFitnessPalImportPanel'
import { ZeppLifeImportPanel } from './ZeppLifeImportPanel'

/** #868 — Zepp / Apple Health / MyFitnessPal live next to JSON backup,
 * not inside `ExportSection`'s backup/analysis status machine. */
export function ThirdPartyImportSection() {
  return (
    <>
      <ZeppLifeImportPanel />
      <AppleHealthImportPanel />
      <MyFitnessPalImportPanel />
    </>
  )
}
