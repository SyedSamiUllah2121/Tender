'use client';

import React, {useEffect, useState} from 'react';
import {LoadingScreen} from '../components/ui/LoadingScreen';
import {AuthProvider} from '../context/AuthContext';

/**
 * The tender repository is a localStorage-backed singleton that seeds itself
 * with generated ids and timestamps. Server-rendered markup could therefore
 * never match the first client render, so the tree is mounted on the client
 * only and a stable boot screen is served until then.
 */
export function Providers({children}: {children: React.ReactNode}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <LoadingScreen />;

  return <AuthProvider>{children}</AuthProvider>;
}
