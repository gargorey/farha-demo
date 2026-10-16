import { useTranslation } from 'react-i18next';
import type { FieldError } from 'react-hook-form';
import { validationParams } from './schemas';

/** Turns a schema message key into a translated, parameterised message. */
export function useFieldError() {
  const { t } = useTranslation();
  return (err?: FieldError | { message?: string }) => (err?.message ? t(err.message, validationParams[err.message] ?? {}) : undefined);
}
