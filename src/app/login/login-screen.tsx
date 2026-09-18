'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { HOME_ROUTE, useSession } from '../../context/AuthContext';
import { LoginView } from '../../views/LoginView';

export function LoginScreen() {
  const { session, signIn } = useSession();
  const router = useRouter();

  /*
    Signing in always opens the dashboard, whatever route sent someone here.
    Covers both a fresh sign-in and someone returning with a live session.
  */
  useEffect(() => {
    if (session) router.replace(HOME_ROUTE);
  }, [session, router]);

  if (session) return <LoadingScreen message="Opening your workspace…" />;

  return <LoginView onSignIn={signIn} />;
}
