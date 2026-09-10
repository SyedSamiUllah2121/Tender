'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { tenderRepository } from '../lib/repositories/tenderRepository';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  switchUserByEmail: (email: string) => void;
  isAuthenticated: boolean;
  refreshData: () => void;
  dataVersion: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => tenderRepository.getUsers());
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    // Default to Mr. Hassan (SUPER_ADMIN) or saved
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('inspire_user_id') : null;
    const users = tenderRepository.getUsers();
    if (savedId) {
      const found = users.find((u) => u.id === savedId);
      if (found) return found;
    }
    return users.find((u) => u.role === 'SUPER_ADMIN') || users[0];
  });
  const [dataVersion, setDataVersion] = useState(1);

  const refreshData = () => {
    setAllUsers(tenderRepository.getUsers());
    setDataVersion((v) => v + 1);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inspire_user_id', user.id);
    }
    setDataVersion((v) => v + 1);
  };

  const switchUser = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const switchUserByEmail = (email: string) => {
    const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setCurrentUser(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        setCurrentUser,
        switchUser,
        switchUserByEmail,
        isAuthenticated: Boolean(currentUser),
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
