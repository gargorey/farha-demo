import { appEnv } from '@/config/env';
import i18n from '@/i18n';
import { getSession } from '../auth/session';
import type { AdminApiClient } from '../models';
import { createHttpAdminClient } from './http-admin-client';
import { createMockAdminClient } from './mock-admin-client';

/** The single admin API instance. Switch with VITE_API_MODE, like the website. */
export const adminApi: AdminApiClient =
  appEnv.apiMode === 'http'
    ? createHttpAdminClient(appEnv.apiBaseUrl, () => i18n.language)
    : createMockAdminClient(() => getSession()?.name ?? 'Unknown');
