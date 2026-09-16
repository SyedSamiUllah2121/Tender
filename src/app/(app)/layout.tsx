import React from 'react';
import {RequireAuth} from '../../context/AuthContext';
import {AppShell} from './app-shell';

/** Everything in this group is signed-in territory and wears the app chrome. */
export default function AppLayout({children}: {children: React.ReactNode}) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
