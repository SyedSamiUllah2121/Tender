'use client';

import React from 'react';

/**
 * Shown while the client-only tree boots and while a redirect is in flight, so
 * those moments look deliberate instead of blank.
 */
export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Loading commercial workspace…',
}) => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] animate-fade-in">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <span className="absolute inset-0 rounded-lg bg-[#8b151b] animate-soft-ping" aria-hidden="true" />
        <div className="relative w-10 h-10 rounded-lg bg-[#8b151b] text-white flex items-center justify-center font-semibold text-xs tracking-wider shadow-sm">
          IB
        </div>
      </div>
      <div className="w-28 h-1 rounded-full overflow-hidden bg-slate-200" aria-hidden="true">
        <div className="h-full w-full bg-[linear-gradient(90deg,transparent,#8b151b,transparent)] bg-[length:200%_100%] animate-shimmer" />
      </div>
      <div className="text-[11px] font-medium text-slate-400 tracking-tight">{message}</div>
    </div>
  </div>
);
