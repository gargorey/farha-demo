export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'DATE_UNAVAILABLE'
  | 'TRANSITION_NOT_ALLOWED'
  | 'POLICY_WINDOW_CLOSED'
  | 'UNKNOWN';

export interface FieldError {
  field: string;
  /** i18n key */
  messageKey: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(code: ApiErrorCode, status: number, message?: string, fieldErrors: FieldError[] = []) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface Paginated<T> {
  items: T[];
  total: number;
}
