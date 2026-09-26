import type { FoodItem } from './foods'

/**
 * #1010 / #1014 — LDL foods on the searchable catalog.
 * Macros are per 100 g. Russian reasons use «ЛПНП», not the Latin LDL
 * from the source sheet. Exact `ru` matches update that row in place.
 */
export interface LdlStapleFood {
  id: string
  nameRu: string
  nameEn: string
  kcal100: number
  protein100: number
  fat100: number
  carbs100: number
  cholesterolImpact: NonNullable<FoodItem['cholesterolImpact']>
  cholesterolReason: string
}

export const LDL_STAPLE_FOODS: LdlStapleFood[] = [
  {
    id: 'oatmeal',
    nameRu: 'Овсянка',
    nameEn: 'Oatmeal',
    kcal100: 71,
    protein100: 2.5,
    fat100: 1.5,
    carbs100: 12,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Овёс содержит растворимую клетчатку, включая бета-глюкан, которая помогает снижать ЛПНП.',
  },
  {
    id: 'pearl-barley-cooked',
    nameRu: 'Перловка',
    nameEn: 'Pearl barley',
    kcal100: 123,
    protein100: 2.3,
    fat100: 0.4,
    carbs100: 28.2,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Ячмень богат растворимой клетчаткой и бета-глюканом, полезными для снижения ЛПНП.',
  },
  {
    id: 'lentils-cooked-staple',
    nameRu: 'Чечевица',
    nameEn: 'Lentils',
    kcal100: 116,
    protein100: 9,
    fat100: 0.4,
    carbs100: 20.1,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Чечевица богата клетчаткой и содержит очень мало насыщенных жиров.',
  },
  {
    id: 'beans-cooked',
    nameRu: 'Фасоль',
    nameEn: 'Beans',
    kcal100: 127,
    protein100: 8.7,
    fat100: 0.5,
    carbs100: 22.8,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Фасоль богата растворимой клетчаткой и практически не содержит насыщенных жиров.',
  },
  {
    id: 'chickpeas-cooked-staple',
    nameRu: 'Нут',
    nameEn: 'Chickpeas',
    kcal100: 164,
    protein100: 8.9,
    fat100: 2.6,
    carbs100: 27.4,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Нут содержит много клетчатки и преимущественно ненасыщенные жиры.',
  },
  {
    id: 'peas-cooked',
    nameRu: 'Горох',
    nameEn: 'Peas',
    kcal100: 84,
    protein100: 5.4,
    fat100: 0.4,
    carbs100: 15.6,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Горох содержит клетчатку и мало насыщенных жиров.',
  },
  {
    id: 'broccoli',
    nameRu: 'Брокколи',
    nameEn: 'Broccoli',
    kcal100: 35,
    protein100: 2.4,
    fat100: 0.4,
    carbs100: 7.2,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Брокколи добавляет клетчатку при очень низком содержании насыщенных жиров.',
  },
  {
    id: 'brussels-sprouts',
    nameRu: 'Брюссельская капуста',
    nameEn: 'Brussels sprouts',
    kcal100: 36,
    protein100: 2.6,
    fat100: 0.5,
    carbs100: 7.1,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Брюссельская капуста богата клетчаткой и почти не содержит насыщенных жиров.',
  },
  {
    id: 'carrot',
    nameRu: 'Морковь',
    nameEn: 'Carrot',
    kcal100: 35,
    protein100: 0.8,
    fat100: 0.2,
    carbs100: 8.2,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Морковь содержит клетчатку, включая растворимые фракции, и почти не содержит насыщенных жиров.',
  },
  {
    id: 'eggplant',
    nameRu: 'Баклажаны',
    nameEn: 'Eggplant',
    kcal100: 35,
    protein100: 0.8,
    fat100: 0.2,
    carbs100: 8.7,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Баклажаны дают клетчатку при низкой калорийности и минимуме насыщенных жиров.',
  },
  {
    id: 'apples',
    nameRu: 'Яблоки',
    nameEn: 'Apples',
    kcal100: 52,
    protein100: 0.3,
    fat100: 0.2,
    carbs100: 13.8,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Яблоки содержат пектин — растворимую клетчатку, полезную для контроля ЛПНП.',
  },
  {
    id: 'citrus-fruits',
    nameRu: 'Цитрусовые',
    nameEn: 'Citrus fruits',
    kcal100: 47,
    protein100: 0.9,
    fat100: 0.1,
    carbs100: 11.8,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Цитрусовые содержат пектин и другую клетчатку, полезную для ЛПНП.',
  },
  {
    id: 'flaxseeds',
    nameRu: 'Семена льна',
    nameEn: 'Flaxseeds',
    kcal100: 534,
    protein100: 18.3,
    fat100: 42.2,
    carbs100: 28.9,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Семена льна богаты клетчаткой и ненасыщенными жирами.',
  },
  {
    id: 'chia-seeds',
    nameRu: 'Семена чиа',
    nameEn: 'Chia seeds',
    kcal100: 486,
    protein100: 16.5,
    fat100: 30.7,
    carbs100: 42.1,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Семена чиа богаты клетчаткой и ненасыщенными жирами.',
  },
  {
    id: 'psyllium-husk',
    nameRu: 'Псиллиум',
    nameEn: 'Psyllium husk',
    kcal100: 200,
    protein100: 2.5,
    fat100: 0.6,
    carbs100: 88,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Псиллиум — концентрированный источник растворимой клетчатки, которая помогает снижать ЛПНП.',
  },
  {
    id: 'salad-coleslaw',
    nameRu: 'Салат Коул слоу',
    nameEn: 'Coleslaw',
    kcal100: 95,
    protein100: 1.4,
    fat100: 7.5,
    carbs100: 6.3,
    cholesterolImpact: 'beneficial',
    cholesterolReason:
      'Капуста и морковь дают клетчатку при относительно небольшом количестве насыщенных жиров. Хороший овощной салат для рациона, направленного на снижение ЛПНП.',
  },
]

function sameStaple(food: FoodItem, staple: LdlStapleFood): boolean {
  return (
    food.kcal100 === staple.kcal100 &&
    food.protein100 === staple.protein100 &&
    food.fat100 === staple.fat100 &&
    food.carbs100 === staple.carbs100 &&
    food.cholesterolImpact === staple.cholesterolImpact &&
    food.cholesterolReason === staple.cholesterolReason
  )
}

/**
 * Puts each staple on the catalog. An exact Russian name is updated in
 * place (same id, servings, and English label). Anything else is appended.
 * A second call changes nothing.
 */
export function mergeLdlStaples(catalog: readonly FoodItem[]): FoodItem[] {
  const foods = catalog.map((food) => ({ ...food }))
  for (const staple of LDL_STAPLE_FOODS) {
    const index = foods.findIndex((food) => food.ru === staple.nameRu)
    if (index === -1) {
      foods.push({
        id: staple.id,
        en: staple.nameEn,
        ru: staple.nameRu,
        kcal100: staple.kcal100,
        protein100: staple.protein100,
        fat100: staple.fat100,
        carbs100: staple.carbs100,
        cholesterolImpact: staple.cholesterolImpact,
        cholesterolReason: staple.cholesterolReason,
      })
      continue
    }
    const existing = foods[index]
    if (!existing || sameStaple(existing, staple)) continue
    foods[index] = {
      ...existing,
      kcal100: staple.kcal100,
      protein100: staple.protein100,
      fat100: staple.fat100,
      carbs100: staple.carbs100,
      cholesterolImpact: staple.cholesterolImpact,
      cholesterolReason: staple.cholesterolReason,
    }
  }
  return foods
}
