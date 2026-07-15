/**
 * A small, hand-curated reference list of common foods (#62) — not user data,
 * not editable, not synced with backups. Per-100g macros are typical
 * published values for each food (USDA-style figures), not sourced from any
 * single proprietary database. Covers everyday staples across a handful of
 * categories; not exhaustive, no branded/packaged products or barcodes.
 */
export interface FoodItem {
  id: string
  en: string
  ru: string
  kcal100: number
  protein100: number
  fat100: number
  carbs100: number
}

export const foods: FoodItem[] = [
  // Meat & poultry
  { id: 'chicken-breast', en: 'Chicken breast', ru: 'Куриная грудка', kcal100: 165, protein100: 31, fat100: 3.6, carbs100: 0 },
  { id: 'chicken-thigh', en: 'Chicken thigh', ru: 'Куриное бедро', kcal100: 209, protein100: 26, fat100: 10.9, carbs100: 0 },
  { id: 'beef-lean', en: 'Beef, lean', ru: 'Говядина постная', kcal100: 187, protein100: 26, fat100: 8.6, carbs100: 0 },
  { id: 'pork-loin', en: 'Pork loin', ru: 'Свиная вырезка', kcal100: 143, protein100: 26, fat100: 3.5, carbs100: 0 },
  { id: 'turkey-breast', en: 'Turkey breast', ru: 'Индейка, грудка', kcal100: 135, protein100: 30, fat100: 1, carbs100: 0 },
  { id: 'bacon', en: 'Bacon', ru: 'Бекон', kcal100: 541, protein100: 37, fat100: 42, carbs100: 1.4 },
  { id: 'sausage', en: 'Sausage', ru: 'Колбаса', kcal100: 301, protein100: 13, fat100: 27, carbs100: 2 },
  // Fish & seafood
  { id: 'salmon', en: 'Salmon', ru: 'Лосось', kcal100: 208, protein100: 20, fat100: 13, carbs100: 0 },
  { id: 'tuna', en: 'Tuna', ru: 'Тунец', kcal100: 132, protein100: 28, fat100: 1.3, carbs100: 0 },
  { id: 'cod', en: 'Cod', ru: 'Треска', kcal100: 82, protein100: 18, fat100: 0.7, carbs100: 0 },
  { id: 'shrimp', en: 'Shrimp', ru: 'Креветки', kcal100: 99, protein100: 24, fat100: 0.3, carbs100: 0.2 },
  // Dairy & eggs
  { id: 'egg', en: 'Egg', ru: 'Яйцо', kcal100: 155, protein100: 13, fat100: 11, carbs100: 1.1 },
  { id: 'milk-whole', en: 'Milk, whole', ru: 'Молоко цельное', kcal100: 61, protein100: 3.2, fat100: 3.3, carbs100: 4.8 },
  { id: 'yogurt-plain', en: 'Yogurt, plain', ru: 'Йогурт натуральный', kcal100: 61, protein100: 3.5, fat100: 3.3, carbs100: 4.7 },
  { id: 'greek-yogurt', en: 'Greek yogurt', ru: 'Греческий йогурт', kcal100: 97, protein100: 9, fat100: 5, carbs100: 4 },
  { id: 'cottage-cheese', en: 'Cottage cheese', ru: 'Творог', kcal100: 98, protein100: 11, fat100: 4.3, carbs100: 3.4 },
  { id: 'cheddar', en: 'Cheddar cheese', ru: 'Сыр чеддер', kcal100: 403, protein100: 25, fat100: 33, carbs100: 1.3 },
  { id: 'butter', en: 'Butter', ru: 'Масло сливочное', kcal100: 717, protein100: 0.9, fat100: 81, carbs100: 0.1 },
  // Grains & legumes
  { id: 'rice-white', en: 'Rice, white, cooked', ru: 'Рис белый, варёный', kcal100: 130, protein100: 2.7, fat100: 0.3, carbs100: 28 },
  { id: 'rice-brown', en: 'Rice, brown, cooked', ru: 'Рис бурый, варёный', kcal100: 112, protein100: 2.3, fat100: 0.9, carbs100: 24 },
  { id: 'buckwheat', en: 'Buckwheat, cooked', ru: 'Гречка, варёная', kcal100: 92, protein100: 3.4, fat100: 0.6, carbs100: 20 },
  { id: 'oats', en: 'Oats, cooked', ru: 'Овсянка, варёная', kcal100: 71, protein100: 2.5, fat100: 1.5, carbs100: 12 },
  { id: 'pasta', en: 'Pasta, cooked', ru: 'Макароны, варёные', kcal100: 131, protein100: 5, fat100: 1.1, carbs100: 25 },
  { id: 'bread-white', en: 'Bread, white', ru: 'Хлеб белый', kcal100: 265, protein100: 9, fat100: 3.2, carbs100: 49 },
  { id: 'bread-whole-wheat', en: 'Bread, whole wheat', ru: 'Хлеб цельнозерновой', kcal100: 247, protein100: 13, fat100: 3.4, carbs100: 41 },
  { id: 'lentils', en: 'Lentils, cooked', ru: 'Чечевица, варёная', kcal100: 116, protein100: 9, fat100: 0.4, carbs100: 20 },
  { id: 'chickpeas', en: 'Chickpeas, cooked', ru: 'Нут, варёный', kcal100: 164, protein100: 9, fat100: 2.6, carbs100: 27 },
  { id: 'black-beans', en: 'Black beans, cooked', ru: 'Чёрная фасоль, варёная', kcal100: 132, protein100: 8.9, fat100: 0.5, carbs100: 24 },
  { id: 'quinoa', en: 'Quinoa, cooked', ru: 'Киноа, варёная', kcal100: 120, protein100: 4.4, fat100: 1.9, carbs100: 21 },
  // Vegetables
  { id: 'potato', en: 'Potato, boiled', ru: 'Картофель варёный', kcal100: 87, protein100: 1.9, fat100: 0.1, carbs100: 20 },
  { id: 'sweet-potato', en: 'Sweet potato, boiled', ru: 'Батат варёный', kcal100: 76, protein100: 1.4, fat100: 0.1, carbs100: 18 },
  { id: 'broccoli', en: 'Broccoli', ru: 'Брокколи', kcal100: 34, protein100: 2.8, fat100: 0.4, carbs100: 7 },
  { id: 'carrot', en: 'Carrot', ru: 'Морковь', kcal100: 41, protein100: 0.9, fat100: 0.2, carbs100: 10 },
  { id: 'tomato', en: 'Tomato', ru: 'Помидор', kcal100: 18, protein100: 0.9, fat100: 0.2, carbs100: 3.9 },
  { id: 'cucumber', en: 'Cucumber', ru: 'Огурец', kcal100: 15, protein100: 0.7, fat100: 0.1, carbs100: 3.6 },
  { id: 'bell-pepper', en: 'Bell pepper', ru: 'Болгарский перец', kcal100: 31, protein100: 1, fat100: 0.3, carbs100: 6 },
  { id: 'spinach', en: 'Spinach', ru: 'Шпинат', kcal100: 23, protein100: 2.9, fat100: 0.4, carbs100: 3.6 },
  { id: 'cabbage', en: 'Cabbage', ru: 'Капуста', kcal100: 25, protein100: 1.3, fat100: 0.1, carbs100: 6 },
  { id: 'onion', en: 'Onion', ru: 'Лук репчатый', kcal100: 40, protein100: 1.1, fat100: 0.1, carbs100: 9 },
  { id: 'avocado', en: 'Avocado', ru: 'Авокадо', kcal100: 160, protein100: 2, fat100: 15, carbs100: 9 },
  { id: 'mushroom', en: 'Mushroom', ru: 'Грибы', kcal100: 22, protein100: 3.1, fat100: 0.3, carbs100: 3.3 },
  // Fruits
  { id: 'apple', en: 'Apple', ru: 'Яблоко', kcal100: 52, protein100: 0.3, fat100: 0.2, carbs100: 14 },
  { id: 'banana', en: 'Banana', ru: 'Банан', kcal100: 89, protein100: 1.1, fat100: 0.3, carbs100: 23 },
  { id: 'orange', en: 'Orange', ru: 'Апельсин', kcal100: 47, protein100: 0.9, fat100: 0.1, carbs100: 12 },
  { id: 'grapes', en: 'Grapes', ru: 'Виноград', kcal100: 69, protein100: 0.7, fat100: 0.2, carbs100: 18 },
  { id: 'strawberry', en: 'Strawberry', ru: 'Клубника', kcal100: 32, protein100: 0.7, fat100: 0.3, carbs100: 7.7 },
  { id: 'blueberry', en: 'Blueberry', ru: 'Черника', kcal100: 57, protein100: 0.7, fat100: 0.3, carbs100: 14 },
  { id: 'watermelon', en: 'Watermelon', ru: 'Арбуз', kcal100: 30, protein100: 0.6, fat100: 0.2, carbs100: 8 },
  { id: 'pear', en: 'Pear', ru: 'Груша', kcal100: 57, protein100: 0.4, fat100: 0.1, carbs100: 15 },
  // Nuts, seeds & oils
  { id: 'almonds', en: 'Almonds', ru: 'Миндаль', kcal100: 579, protein100: 21, fat100: 50, carbs100: 22 },
  { id: 'walnuts', en: 'Walnuts', ru: 'Грецкие орехи', kcal100: 654, protein100: 15, fat100: 65, carbs100: 14 },
  { id: 'peanut-butter', en: 'Peanut butter', ru: 'Арахисовая паста', kcal100: 588, protein100: 25, fat100: 50, carbs100: 20 },
  { id: 'olive-oil', en: 'Olive oil', ru: 'Оливковое масло', kcal100: 884, protein100: 0, fat100: 100, carbs100: 0 },
  { id: 'sunflower-seeds', en: 'Sunflower seeds', ru: 'Семечки подсолнуха', kcal100: 584, protein100: 21, fat100: 51, carbs100: 20 },
  // Bakery & snacks
  { id: 'honey', en: 'Honey', ru: 'Мёд', kcal100: 304, protein100: 0.3, fat100: 0, carbs100: 82 },
  { id: 'dark-chocolate', en: 'Dark chocolate', ru: 'Тёмный шоколад', kcal100: 546, protein100: 4.9, fat100: 31, carbs100: 61 },
  { id: 'potato-chips', en: 'Potato chips', ru: 'Картофельные чипсы', kcal100: 536, protein100: 7, fat100: 34, carbs100: 53 },
  { id: 'granola', en: 'Granola', ru: 'Гранола', kcal100: 471, protein100: 10, fat100: 20, carbs100: 64 },
  { id: 'ice-cream', en: 'Ice cream', ru: 'Мороженое', kcal100: 207, protein100: 3.5, fat100: 11, carbs100: 24 },
]
