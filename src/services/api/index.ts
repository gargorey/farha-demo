import { appEnv } from '@/config/env';
import i18n from '@/i18n';
import { createMockClient } from '../mock/mock-client';
import type { ApiClient } from './client';
import { createHttpClient } from './http-client';

export type { ApiClient, ContactMessage } from './client';

/** The single API instance used by the app. Switch with VITE_API_MODE. */
export const api: ApiClient =
  appEnv.apiMode === 'http' ? createHttpClient(appEnv.apiBaseUrl, () => i18n.language) : createMockClient();
