import type { Recipe } from '@/domain/recipe'
import type { Dictionary } from '@/i18n'
import { formatExactNumber, type Locale } from '@/i18n'

/**
 * Plain-text ingredient list for a recipe (#611) — recipe name as a
 * heading, one `- ` bulleted line per ingredient with its amount in grams
 * when known (manual-entry ingredients without a per-100g rate have no
 * `amountG`, same optional field `RecipeEditorDialog.tsx` already treats
 * as "not recorded"). No macros/prices — this is a shopping list, not a
 * nutrition summary.
 */
export function buildRecipeShoppingListText(
  recipe: Recipe,
  locale: Locale,
  t: Dictionary,
): string {
  const lines = recipe.ingredients.map((ingredient) => {
    const amount =
      ingredient.amountG === undefined
        ? ''
        : ` (${formatExactNumber(ingredient.amountG, locale)}${t.dailyEntry.gramsUnit})`
    return `- ${ingredient.name}${amount}`
  })
  return [recipe.name, ...lines].join('\n')
}
