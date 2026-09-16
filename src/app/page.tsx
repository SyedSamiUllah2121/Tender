'use client';

import {useRouter} from 'next/navigation';
import React, {useEffect} from 'react';
import {LoadingScreen} from '../components/ui/LoadingScreen';
import {HOME_ROUTE, LOGIN_ROUTE, useSession} from '../context/AuthContext';

/**
 * The entry point only decides where to go: the dashboard for a live session,
 * the sign-in screen otherwise. It cannot be a server redirect, because the
 * session lives in the browser.
 */
export default function HomePage() {
  const {session} = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(session ? HOME_ROUTE : LOGIN_ROUTE);
  }, [session, router]);

  return <LoadingScreen />;
}
