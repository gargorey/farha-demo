const env = import.meta.env;

export const appEnv = {
  apiMode: env.VITE_API_MODE === 'http' ? 'http' : 'mock',
  apiBaseUrl: env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  mockLatencyMs: Number(env.VITE_MOCK_LATENCY_MS ?? 450),
  routerMode: env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser',
} as const;
