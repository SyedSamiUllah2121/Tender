'use client';

import React from 'react';

/**
 * Shown while the client-only tree boots and while a redirect is in flight, so
 * those moments look deliberate instead of blank.
 */
export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Loading commercial workspace…',
}) => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-[#8b151b] text-white flex items-center justify-center font-semibold text-xs tracking-wider">
        IB
      </div>
      <div className="text-[11px] font-medium text-slate-400 tracking-tight">{message}</div>
    </div>
  </div>
);
