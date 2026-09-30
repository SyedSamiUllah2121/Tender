'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { destinationAfterSignIn, useSession } from '../../context/AuthContext';
import { LoginView } from '../../views/LoginView';

export function LoginScreen() {
  const { session, signIn } = useSession();
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

  return <LoginView onSignIn={signIn} />;
}
