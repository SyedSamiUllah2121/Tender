'use client';

import React, {useEffect, useState} from 'react';
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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#8b151b] text-white flex items-center justify-center font-semibold text-xs tracking-wider">
            IB
          </div>
          <div className="text-[11px] font-medium text-slate-400 tracking-tight">
            Loading commercial workspace…
          </div>
        </div>
      </div>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
}
