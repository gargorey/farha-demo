import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type CustomerSessionInfo } from '@/services/api';
import { CustomerSessionContext, type CustomerSessionValue } from './session-context';

/** Shares the customer's sign-in state (header, My bookings, sign-in page). */
export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSessionInfo>({ verified: false });

  const refresh = useCallback(async () => {
    try {
      setSession(await api.getCustomerSession());
    } catch {
      setSession({ verified: false });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      setSession({ verified: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CustomerSessionValue>(() => ({ session, refresh, signOut }), [session, refresh, signOut]);
  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}
