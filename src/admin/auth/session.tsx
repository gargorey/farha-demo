import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { adminApi } from '../api';
import { ADMIN_UNAUTHORIZED_EVENT } from '../api/http-admin-client';
import type { Permission, StaffUser } from '../models';
import { can } from './roles';

/**
 * Staff session.
 * - Demo (mock API): pick a sample account, no password; kept in sessionStorage.
 * - Backend: e-mail + password; the server keeps the session in an httpOnly cookie
 *   and checks permissions on every request. The browser only mirrors the user here.
 */
const KEY = 'farha.demo.admin.session';

export const getSession = () => readJSON<StaffUser | null>(KEY, null, 'session');

interface SessionValue {
  /** False until the backend has said whether a session exists. */
  ready: boolean;
  user: StaffUser | null;
  mustChangePassword: boolean;
  /** Demo sign-in with a sample account. */
  signIn: (user: StaffUser) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  passwordChanged: () => void;
  signOut: () => void;
  can: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const live = !adminApi.isDemo;
  const [user, setUser] = useState<StaffUser | null>(() => (live ? null : getSession()));
  const [mustChangePassword, setMustChange] = useState(false);
  const [ready, setReady] = useState(!live);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    adminApi
      .getMe()
      .then((r) => {
        if (!alive) return;
        setUser(r.user);
        setMustChange(r.mustChangePassword);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    const expired = () => setUser(null);
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, expired);
    return () => {
      alive = false;
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, expired);
    };
  }, [live]);

  const signIn = useCallback((u: StaffUser) => {
    writeJSON(KEY, u, 'session');
    setUser(u);
  }, []);
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const r = await adminApi.signIn(email, password);
    setUser(r.user);
    setMustChange(r.mustChangePassword);
  }, []);
  const signOut = useCallback(() => {
    removeKey(KEY, 'session');
    setUser(null);
    setMustChange(false);
    if (live) void adminApi.signOut().catch(() => {});
  }, [live]);
  const passwordChanged = useCallback(() => setMustChange(false), []);

  const value = useMemo(
    () => ({ ready, user, mustChangePassword, signIn, signInWithPassword, passwordChanged, signOut, can: (p: Permission) => can(user?.role, p) }),
    [ready, user, mustChangePassword, signIn, signInWithPassword, passwordChanged, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
