import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import type { Permission, StaffUser } from '../models';
import { can } from './roles';

/**
 * DEMO sign-in: pick a sample staff account, no password. The session lives in
 * sessionStorage. Project 2 replaces this with real authentication (e.g. email +
 * password with 2FA, or company SSO) and server-side permission checks.
 */
const KEY = 'farha.demo.admin.session';

export const getSession = () => readJSON<StaffUser | null>(KEY, null, 'session');

interface SessionValue {
  user: StaffUser | null;
  signIn: (user: StaffUser) => void;
  signOut: () => void;
  can: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(getSession);
  const signIn = useCallback((u: StaffUser) => {
    writeJSON(KEY, u, 'session');
    setUser(u);
  }, []);
  const signOut = useCallback(() => {
    removeKey(KEY, 'session');
    setUser(null);
  }, []);
  const value = useMemo(() => ({ user, signIn, signOut, can: (p: Permission) => can(user?.role, p) }), [user, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
