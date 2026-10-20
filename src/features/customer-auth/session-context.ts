import { createContext, useContext } from 'react';
import type { CustomerSessionInfo } from '@/services/api';

export interface CustomerSessionValue {
  session: CustomerSessionInfo;
  /** Re-reads the session after signing in. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CustomerSessionContext = createContext<CustomerSessionValue | null>(null);

export function useCustomerSession(): CustomerSessionValue {
  const ctx = useContext(CustomerSessionContext);
  if (!ctx) throw new Error('useCustomerSession must be used inside CustomerSessionProvider');
  return ctx;
}
