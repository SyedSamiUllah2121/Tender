import type {Metadata} from 'next';
import React, {Suspense} from 'react';
import {LoadingScreen} from '../../components/ui/LoadingScreen';
import {LoginScreen} from './login-screen';

export const metadata: Metadata = {title: 'Sign in'};

// LoginScreen reads the `next` search param, so it needs a Suspense boundary.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginScreen />
    </Suspense>
  );
}
