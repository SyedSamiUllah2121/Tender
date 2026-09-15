'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '../types';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { LoginView } from '../views/LoginView';

const SESSION_KEY = 'inspire_user_id';

interface AuthContextType {
  /** The signed-in person. Children only render once there is a session, so
   *  this is never null inside the app. */
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  signOut: () => void;
  refreshData: () => void;
  dataVersion: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readSession = (): User | null => {
  if (typeof window === 'undefined') return null;
  const savedId = localStorage.getItem(SESSION_KEY);
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
    if (typeof window !== 'undefined') localStorage.setItem(SESSION_KEY, user.id);
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
    if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  // The app tree never mounts without a session, so every screen behind this
  // point can rely on currentUser being present.
  if (!session) return <LoginView onSignIn={signIn} />;

  return (
    <AuthContext.Provider
      value={{
        currentUser: session,
        allUsers,
        setCurrentUser,
        signOut,
        refreshData,
        dataVersion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
