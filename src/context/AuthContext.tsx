'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { User } from '../types';

const SESSION_KEY = 'inspire_user_id';

/** The sign-in screen, and the screen a signed-in person lands on. */
export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/dashboard';

interface SessionContextType {
  /** Null until somebody signs in. Only the login screen should see that. */
  session: User | null;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  /** Returns an error message, or null when the sign-in succeeded. */
  signIn: (email: string, password: string) => string | null;
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

const readSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  sessionStore.dropLegacy();
  const savedId = sessionStore.read();
  if (!savedId) return null;
  const user = tenderRepository.getUserById(savedId);
  // A person removed or deactivated since their last visit loses the session.
  return user && !user.deletedAt && user.isActive ? user : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<User | null>(readSession);
  const [allUsers, setAllUsers] = useState<User[]>(() => tenderRepository.getUsers());
  const [dataVersion, setDataVersion] = useState(1);

  const refreshData = () => {
    setAllUsers(tenderRepository.getUsers());
    setDataVersion((v) => v + 1);
  };

  const setCurrentUser = (user: User) => {
    setSession(user);
    if (typeof window !== 'undefined') sessionStore.write(user.id);
    setDataVersion((v) => v + 1);
  };

  const signIn = (email: string, password: string): string | null => {
    const { user, error } = tenderRepository.signIn(email, password);
    if (error || !user) return error || 'Unable to sign in.';
    setAllUsers(tenderRepository.getUsers());
    setCurrentUser(user);
    return null;
  };

  const signOut = () => {
    if (typeof window !== 'undefined') sessionStore.clear();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        allUsers,
        setCurrentUser,
        signIn,
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
 * being present. Signing in always opens the dashboard, so where someone was
 * headed is deliberately not carried across.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) return;
    router.replace(LOGIN_ROUTE);
  }, [session, router]);

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
