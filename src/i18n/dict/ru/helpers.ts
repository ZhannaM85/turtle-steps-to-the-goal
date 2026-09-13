import { ruPluralize } from '../../ruPluralize'

export function goalCount(n: number): string {
  return `${n} ${ruPluralize(n, 'цель', 'цели', 'целей')}`
}

export function entryCount(n: number): string {
  return `${n} ${ruPluralize(n, 'запись', 'записи', 'записей')}`
}

export function dayCount(n: number): string {
  return `${n} ${ruPluralize(n, 'день', 'дня', 'дней')}`
}
