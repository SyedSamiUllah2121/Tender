'use client';

import {usePathname} from 'next/navigation';
import React, {useEffect, useState} from 'react';
import {AppHeader} from '../../components/layout/AppHeader';
import {AppSidebar} from '../../components/layout/AppSidebar';
import {CommandPalette} from '../../components/modals/CommandPalette';

export function AppShell({children}: {children: React.ReactNode}) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  // Below the lg breakpoint the sidebar is a drawer rather than a column.
  const [isNavOpen, setIsNavOpen] = useState(false);
  const pathname = usePathname();

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

  // Tapping a nav item navigates; the drawer should not stay over the result.
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  // While the drawer covers the page, Escape closes it and the page behind it
  // must not scroll under the finger.
  useEffect(() => {
    if (!isNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNavOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isNavOpen]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col text-[var(--text-900)] font-sans antialiased">
      {/* Global Header */}
      <AppHeader
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleNav={() => setIsNavOpen((open) => !open)}
        isNavOpen={isNavOpen}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar — a column on desktop, a drawer on small screens */}
        <AppSidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

        {/* Dynamic Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
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
