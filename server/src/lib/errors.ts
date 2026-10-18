import type { ApiErrorCode, FieldError } from '@/models';

const STATUS: Record<ApiErrorCode, number> = {
  NETWORK_ERROR: 503,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  DATE_UNAVAILABLE: 409,
  TRANSITION_NOT_ALLOWED: 409,
  POLICY_WINDOW_CLOSED: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNKNOWN: 500,
};

/** An error that is safe to show to the caller, in the contract's error shape. */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(message ?? code);
    this.status = STATUS[code];
  }
}

export const notFound = (what = 'Not found') => new AppError('NOT_FOUND', what);
