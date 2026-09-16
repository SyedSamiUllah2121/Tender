'use client';

import React, {useEffect, useState} from 'react';
import {AppHeader} from '../../components/layout/AppHeader';
import {AppSidebar} from '../../components/layout/AppSidebar';
import {CommandPalette} from '../../components/modals/CommandPalette';

export function AppShell({children}: {children: React.ReactNode}) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K toggle for the command palette.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col text-[var(--text-900)] font-sans antialiased">
      {/* Global Header */}
      <AppHeader onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <AppSidebar />

        {/* Dynamic Content Canvas */}
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Command Palette (⌘K) Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
