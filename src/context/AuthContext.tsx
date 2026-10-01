'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { User } from '../types';

const SESSION_KEY = 'inspire_user_id';

/** The sign-in screen, and the screen a signed-in person lands on. */
export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/dashboard';

/*
  Signing in opens the dashboard, with one exception: a tender page, which is
  where notification links point, is reopened after sign-in. Only that exact
  shape is accepted, so `?next=` cannot send anyone to another site or screen.
*/
const TENDER_PAGE = /^\/tenders\/(?!new$)[A-Za-z0-9_-]+$/;

/** Where to go after signing in, given the page someone was sent away from. */
export const destinationAfterSignIn = (path: string | null): string =>
  path && TENDER_PAGE.test(path) ? path : HOME_ROUTE;

interface SessionContextType {
  /** Null until somebody signs in. Only the login screen should see that. */
  session: User | null;
  allUsers: User[];
  /** Returns an error message, or null when the sign-in succeeded. */
  signIn: (email: string, password: string) => string | null;
  /** Development only: opens the Manager account with no password. */
  signInAsManager: () => string | null;
  signOut: () => void;
  refreshData: () => void;
  dataVersion: number;
}

interface AuthContextType extends SessionContextType {
  /** The signed-in person. Guaranteed inside <RequireAuth>. */
  currentUser: User;
}

const AuthContext = createContext<SessionContextType | undefined>(undefined);

/*
  The session lives in sessionStorage rather than localStorage, so it ends
  when the browser closes and the next visit has to sign in again. A refresh
  or a move between screens keeps it, because the tab is the same one.

  Storage throws outright rather than returning null in private mode and
  wherever site data is blocked, so every access is guarded. A session that
  cannot be written still works until the tab closes.
*/
const sessionStore = {
  read(): string | null {
    try {
      return window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  write(id: string) {
    try {
      window.sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      /* Nothing to do; the session is held in memory either way. */
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Nothing to forget. */
    }
  },
  /*
    Sessions used to be kept in localStorage, which never expires, so anyone
    who signed in once was never asked again. Their key is dropped on the way
    past so it does not sit in the browser forever.
  */
  dropLegacy() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* Nothing to drop. */
    }
  },
};

/** The stored record for a session, or null once it is removed or deactivated. */
const resolveUser = (id: string): User | null => {
  const user = tenderRepository.getUserById(id);
  return user && !user.deletedAt && user.isActive ? user : null;
};

const readSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  sessionStore.dropLegacy();
  const savedId = sessionStore.read();
  // A person removed or deactivated since their last visit loses the session.
  return savedId ? resolveUser(savedId) : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<User | null>(readSession);
  const [allUsers, setAllUsers] = useState<User[]>(() => tenderRepository.getUsers());
  const [dataVersion, setDataVersion] = useState(1);

  /*
    Edits replace the user record rather than mutating it, so the session is
    looked up again on every refresh. Otherwise someone whose role or
    territory was just changed keeps the old permissions until they sign in
    again, and a person deactivated mid-session keeps working.
  */
  const refreshData = () => {
    // Every save already invalidates; this covers anything that changed the
    // store some other way.
    tenderRepository.invalidateCache();
    setAllUsers(tenderRepository.getUsers());
    setSession((current) => {
      if (!current) return current;
      const fresh = resolveUser(current.id);
      if (!fresh) sessionStore.clear();
      return fresh;
    });
    setDataVersion((v) => v + 1);
  };

  // Another tab saved: take its copy so the roster and passwords match.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (tenderRepository.reloadFromStorage()) refreshData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const startSession = ({ user, error }: { user?: User; error?: string }): string | null => {
    if (error || !user) return error || 'Unable to sign in.';
    setAllUsers(tenderRepository.getUsers());
    setSession(user);
    sessionStore.write(user.id);
    setDataVersion((v) => v + 1);
    return null;
  };

  const signIn = (email: string, password: string): string | null =>
    startSession(tenderRepository.signIn(email, password));

  const signInAsManager = (): string | null => startSession(tenderRepository.signInAsManager());

  const signOut = () => {
    if (typeof window !== 'undefined') sessionStore.clear();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        allUsers,
        signIn,
        signInAsManager,
        signOut,
        refreshData,
        dataVersion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Safe to call with nobody signed in — this is what the login screen uses. */
export const useSession = (): SessionContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within an AuthProvider');
  return ctx;
};

/**
 * Sends anyone without a session to the login screen, and holds the children
 * back until there is one. Every screen behind it can rely on currentUser
 * being present. Arriving signed out on a tender page carries that page to
 * the login screen so signing in reopens it; see destinationAfterSignIn.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  // Losing a session here means signing out, and the next person to sign in
  // should not inherit the tender that was left open.
  const hadSession = useRef(session !== null);

  useEffect(() => {
    if (session) {
      hadSession.current = true;
      return;
    }
    const carry = !hadSession.current && destinationAfterSignIn(pathname) !== HOME_ROUTE;
    router.replace(carry ? `${LOGIN_ROUTE}?next=${encodeURIComponent(pathname)}` : LOGIN_ROUTE);
  }, [session, pathname, router]);

  if (!session) return <LoadingScreen message="Taking you to sign in…" />;

  return <>{children}</>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useSession();
  if (!ctx.session) {
    throw new Error('useAuth needs a signed-in person; render the screen inside <RequireAuth>.');
  }
  return { ...ctx, currentUser: ctx.session };
};
