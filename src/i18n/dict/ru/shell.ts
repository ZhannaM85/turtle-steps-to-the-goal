import type { CommonDict, ErrorDict, UpdateDict, OfflineDict, NavDict } from '../types/shell'

export const common: CommonDict = {
    loading: 'Загрузка…',
    weekRangeLabel: (start, end) => `${start} – ${end}`,
    hideSectionLabel: (title) => `Скрыть: ${title}`,
    showSectionLabel: (title) => `Показать: ${title}`,
    kg: 'кг',
    lb: 'фунт',
  }

export const error: ErrorDict = {
    title: 'Что-то пошло не так',
    description:
      'Произошла непредвиденная ошибка. Ваши данные в безопасности — они хранятся на этом устройстве. Обычно помогает перезагрузка страницы.',
    reloadButton: 'Перезагрузить',
  }

export const update: UpdateDict = {
    availableText: 'Доступна новая версия.',
    reloadButton: 'Перезагрузить',
    reloadingText: 'Перезагрузка…',
  }

export const offline: OfflineDict = {
    offlineText:
      'Вы не в сети — данные всё равно сохраняются на этом устройстве.',
  }

export const nav: NavDict = {
    appName: 'Черепашка идёт к цели',
    scrollToTop: 'Прокрутить наверх',
    today: 'День',
    dashboard: 'Обзор',
    history: 'История',
    goal: 'Цель',
    settings: 'Настройки',
    about: 'О проекте',
  }
