'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../types';

/**
 * Shown when someone reaches a page their role does not cover — the sidebar
 * hides these links, but the routes are still typeable.
 */
export const AccessDenied: React.FC<{ requirement: string }> = ({ requirement }) => {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 rounded-md bg-white border border-[var(--border)] text-center space-y-2">
      <Lock className="w-6 h-6 mx-auto text-slate-400" />
      <h1 className="text-sm font-bold text-slate-900">This area is restricted</h1>
      <p className="text-xs text-slate-500">
        {requirement} You are signed in as {currentUser.name} ({ROLE_LABELS[currentUser.role]}).
      </p>
    </div>
  );
};
