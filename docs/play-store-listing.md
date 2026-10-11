# Play Store listing draft

Part of [#317](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/317).
Prepared 2026-10-11. Copy is ready for review; no store submission or testing-track
upload has been completed by this change. Confirm features against the signed
Android build before publishing.

## English (en)

### App name

Turtle Steps to the Goal

### Short description

Track meals, macros, water and weight trends at your own pace.

### Full description

Build a picture of your everyday habits with Turtle Steps to the Goal. Keep meals,
nutrition, weight and the things that matter to you together in a personal diary.
Choose a gentle pace and use your own history to understand changes over time.

YOUR EVERYDAY DIARY
Log meals, calories, protein, fat, carbohydrates, fiber and water. Add weight,
sleep, steps, mood, notes and body measurements. Record as much or as little as
you find useful, and create custom metrics for the things you want to observe.

FOODS AND RECIPES
Search the food catalog, save personal foods and build reusable recipes with
multiple ingredients. Scan a food barcode or enter it manually. Optional online
food lookup needs an internet connection.

YOUR PACE, YOUR HISTORY
Set weight-change goals and optional daily nutrition and water targets. Explore
charts, calendar history, summaries and correlations between your recorded
metrics. These views describe your entries; they do not establish causes or
provide medical advice.

BACKUP AND IMPORT
Import supported export files from Zepp Life, Apple Health and MyFitnessPal.
File import is separate from live health-app synchronization. Save a backup and
export your records as Excel, CSV or Markdown when you need them.

LOCAL STORAGE AND YOUR CHOICES
Your diary is stored on your device. There is no account to create, no developer
cloud diary and no analytics or telemetry. Make regular backups: uninstalling
the app or clearing its storage can remove your local records.

Exported files and foods or day logs you share through a QR code or link can
leave your device. Share only what you intend to disclose. Optional online
features contact external services; review the privacy policy for details.

Use the app in English or Russian, with light and dark modes and several color
themes. Turtle Steps is a personal tracking tool, not a medical device or a
substitute for professional care.

## Russian (ru)

### App name

Черепашьи шаги к цели

### Short description

Питание, КБЖУ, вода и динамика веса — в вашем темпе.

### Full description

«Черепашьи шаги к цели» помогают наблюдать за повседневными привычками.
Соберите питание, вес и важные для вас показатели в личном дневнике.
Выберите комфортный темп и изучайте изменения по собственным записям.

ПОВСЕДНЕВНЫЙ ДНЕВНИК
Записывайте приёмы пищи, калории, белки, жиры, углеводы, клетчатку и воду.
Добавляйте вес, сон, шаги, настроение, заметки и замеры тела. Заполняйте только
то, что вам полезно, и создавайте свои показатели для наблюдения.

ПРОДУКТЫ И РЕЦЕПТЫ
Ищите продукты в каталоге, сохраняйте свои продукты и составляйте рецепты
из нескольких ингредиентов. Сканируйте штрихкод или вводите его вручную.
Для дополнительного поиска продуктов онлайн нужен интернет.

ВАШ ТЕМП И ВАША ИСТОРИЯ
Задавайте цели изменения веса и необязательные дневные ориентиры по питанию
и воде. Изучайте графики, историю по дням, сводки и связи между записанными
показателями. Эти представления описывают ваши записи, но не устанавливают
причины изменений и не заменяют медицинскую консультацию.

РЕЗЕРВНЫЕ КОПИИ И ИМПОРТ
Импортируйте поддерживаемые файлы экспорта из Zepp Life, Apple Health
и MyFitnessPal. Импорт файлов отличается от прямой синхронизации
с приложениями здоровья. Сохраняйте резервные копии и выгружайте записи
в Excel, CSV или Markdown.

ЛОКАЛЬНОЕ ХРАНЕНИЕ И ВАШ ВЫБОР
Дневник хранится на вашем устройстве. Регистрация не нужна, облачного
дневника у разработчика нет, аналитика и телеметрия не собираются.
Регулярно делайте резервные копии: удаление приложения или очистка
его хранилища может удалить локальные записи.

Экспортированные файлы, продукты и записи дня, которыми вы делитесь через
QR-код или ссылку, могут покинуть устройство. Делитесь только тем, что
хотите передать. Дополнительные онлайн-функции обращаются к внешним
сервисам; подробности приведены в политике конфиденциальности.

Доступны русский и английский языки, светлая и тёмная темы и несколько
цветовых оформлений. Это инструмент для личных записей, а не медицинское
устройство и не замена профессиональной помощи.

## Listing settings to confirm

- Suggested category: Health & Fitness. Confirm in Play Console.
- Website: https://zhannam85.github.io/turtle-steps-to-the-goal/
- Privacy policy: https://zhannam85.github.io/turtle-steps-to-the-goal/privacy
  (verify that this address opens without signing in before submission).
- Support email: owner must choose a public support address before submission.
  Do not copy a private Git author email into the listing automatically.
- No promise of live Apple Health or Zepp Life sync in the listing copy.
- Complete Data Safety and applicable health-app declarations from the actual
  release build and privacy policy. Review online food lookup, barcode lookup,
  camera permissions, exports, QR/link sharing, native plugins and Android
  backup behavior. Local diary storage alone does not settle those answers.

## Screenshot and asset checklist

Use fictional demo records throughout, with separate English and Russian
captures. Capture the signed Android candidate, not just the web app, and keep
the same theme and sample dates across the set.

- [ ] Day: weight, calories/macros and water with readable sample entries.
- [ ] Add meal: catalog search and a meal with several foods.
- [ ] Dashboard: weight and nutrition trends with enough demo history.
- [ ] History: daily entries and nutrition summaries.
- [ ] Settings: custom metrics and backup/export controls.
- [ ] Capture tablet screenshots only if the release supports tablets and the
  layout has been checked on that form factor.
- [ ] Prepare the store icon and feature graphic; check the current Play Console
  dimensions, formats and screenshot requirements using the sources below.
- [ ] Review every image for personal records, identifiers and misleading claims.

Existing README images in `public/screenshots/` and
`scripts/capture-screenshots.mjs` are references for demo content, not proof
that the native release looks or works the same.

## Remaining work for #317

- [ ] Owner reviews the localized copy and confirms support contact/category.
- [ ] Verify listed features and privacy wording against the signed build.
- [ ] Finish localized screenshots and store graphics.
- [ ] Complete Data Safety and other Play Console declarations.
- [ ] Finish #316 enrollment/signing prerequisites.
- [ ] Build and upload a signed release AAB to an internal or closed track.
- [ ] Install from that track on a real device and confirm launch, diary editing,
  backup/import and barcode behavior; use `native-app-device-testing.md` as
  a reference, but a debug APK does not validate the store-delivered build.

Keep #317 open until its remaining scope has been completed and confirmed.

## Official reference

Checked 2026-10-11. App names must fit 30 characters, short descriptions 80,
and full descriptions 4,000, for each locale. Recheck before publication.

- [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en-GB)
- [Store listing best practices](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en-GB)
- [Preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
