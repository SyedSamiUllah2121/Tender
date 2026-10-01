'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { destinationAfterSignIn, useSession } from '../../context/AuthContext';
import { LoginView } from '../../views/LoginView';
import { PASSWORDLESS_MANAGER } from '../../lib/repositories/seedData';

export function LoginScreen() {
  const { session, signIn, signInAsManager } = useSession();
  const router = useRouter();
  const destination = destinationAfterSignIn(useSearchParams().get('next'));

  /*
    Signing in opens the dashboard, or the tender a notification link pointed
    at. Covers both a fresh sign-in and someone returning with a live session.
  */
  useEffect(() => {
    if (session) router.replace(destination);
  }, [session, destination, router]);

  if (session) return <LoadingScreen message="Opening your workspace…" />;

  return (
    <LoginView
      onSignIn={signIn}
      onContinueAsManager={PASSWORDLESS_MANAGER ? signInAsManager : undefined}
    />
  );
}
