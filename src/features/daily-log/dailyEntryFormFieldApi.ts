import type {
  UseFormClearErrors,
  UseFormGetValues,
  UseFormReset,
  UseFormSetError,
  UseFormSetValue,
} from 'react-hook-form'
import type { Dictionary } from '@/i18n'
import type { DailyEntryFormValues } from './dailyEntryFormSchema'

/** Shared RHF + persist handle for Day field hooks (#868). */
export type DailyEntryFormFieldApi = {
  alwaysEditable: boolean
  initialValues: DailyEntryFormValues
  t: Dictionary
  getValues: UseFormGetValues<DailyEntryFormValues>
  setValue: UseFormSetValue<DailyEntryFormValues>
  reset: UseFormReset<DailyEntryFormValues>
  setError: UseFormSetError<DailyEntryFormValues>
  clearErrors: UseFormClearErrors<DailyEntryFormValues>
  persist: (values: DailyEntryFormValues) => void
  /** #1105 — persist after Day-field Apple Health sync with provenance flags. */
  persistWithAppleHealth: (
    values: DailyEntryFormValues,
    flags: {
      weightFromAppleHealth?: boolean
      sleepFromAppleHealth?: boolean
      stepsFromAppleHealth?: boolean
    },
  ) => void
}
