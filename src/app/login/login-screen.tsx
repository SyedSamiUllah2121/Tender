'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { HOME_ROUTE, useSession } from '../../context/AuthContext';
import { LoginView } from '../../views/LoginView';

/** Only same-site paths are honoured, so `?next=` cannot bounce to another site. */
const safeNext = (value: string | null): string =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : HOME_ROUTE;

export function LoginScreen() {
  const { session, signIn } = useSession();
  const router = useRouter();
  const destination = safeNext(useSearchParams().get('next'));

  // Covers both a fresh sign-in and someone returning with a live session.
  useEffect(() => {
    if (session) router.replace(destination);
  }, [session, destination, router]);

  if (session) return <LoadingScreen message="Opening your workspace…" />;

  return <LoginView onSignIn={signIn} />;
}
