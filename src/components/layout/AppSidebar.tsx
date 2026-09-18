'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Trophy,
  CalendarClock,
  BarChart3,
  Users,
  GitFork,
  Briefcase,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { can } from '../../lib/permissions';
import { ACTIVE_STATUSES, isPastFollowUpWindow } from '../../lib/followUpPolicy';
import { ROLE_LABELS, ROLE_SCOPE_NOTE } from '../../types';

interface AppSidebarProps {
  /** Drawer state; only meaningful below the lg breakpoint. */
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const currentPath = usePathname();
  const { currentUser } = useAuth();

  // Get live counts scoped for currentUser
  const tenders = tenderRepository.getTenders(currentUser);
  const activeCount = tenders.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;

  const now = new Date();
  const overdueFollowUps = tenders.filter(
    (t) => ACTIVE_STATUSES.includes(t.status) && t.nextFollowUpAt && new Date(t.nextFollowUpAt) < now
  ).length;

  // Tenders past the mandatory 2-month window with no clear status yet.
  const pastDeadline = tenders.filter((t) => isPastFollowUpWindow(t, now)).length;

  const awardedCount = tenders.filter((t) => t.status === 'AWARDED').length;

  const mainNav = [
    {
      id: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: '/tenders',
      label: 'Tenders Pipeline',
      icon: FileSpreadsheet,
      badge: activeCount,
      badgeColor: 'bg-[#5e0d12] text-white',
    },
    {
      id: '/awarded',
      label: 'Awarded Projects',
      icon: Trophy,
      badge: awardedCount > 0 ? awardedCount : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: '/followups',
      label: 'Follow-ups Worklist',
      icon: CalendarClock,
      badge: overdueFollowUps > 0 ? `${overdueFollowUps} due` : null,
      badgeColor: 'bg-amber-400 text-[#3f2d00] font-bold',
    },
    {
      id: '/reports',
      label: 'Performance Reports',
      icon: BarChart3,
      badge: null,
    },
  ];

  // Manager / Admin 1 / Admin 2 monitoring board.
  const monitorNav = {
    id: '/monitoring',
    label: 'Monitoring Board',
    icon: ShieldAlert,
    // Just the count: "158 past 2m" is wide enough to truncate the label itself.
    badge: pastDeadline > 0 ? pastDeadline : null,
    badgeTitle: `${pastDeadline} past the 2-month deadline`,
    badgeColor: 'bg-[#141414] text-white font-bold',
  };

  if (can(currentUser, 'monitor_department')) {
    mainNav.splice(4, 0, monitorNav);
  }

  const adminNav = [
    {
      id: '/admin/sources',
      label: 'Lead Sources',
      icon: GitFork,
    },
    {
      id: '/admin/consultants',
      label: 'Consultants Directory',
      icon: Briefcase,
    },
    {
      id: '/admin/users',
      label: 'Team & Permissions',
      icon: Users,
    },
  ];

  const showAdminSection = can(currentUser, 'manage_admin');

  const itemClass = (active: boolean) =>
    `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
      active
        ? 'bg-white text-[#8b151b] font-semibold border-r-2 border-white'
        : 'text-[#f3d3d5] hover:text-white hover:bg-[#731217] font-medium border-r-2 border-transparent'
    }`;

  return (
    <>
      {/* Drawer backdrop, small screens only */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-sidebar"
        aria-label="Primary"
        className={`fixed top-0 left-0 z-50 h-dvh w-60 shrink-0 overflow-y-auto bg-[#8b151b] border-r border-[#5e0d12] p-3.5 flex flex-col justify-between gap-6 select-none transition-transform duration-200 lg:sticky lg:top-24 lg:z-auto lg:h-[calc(100dvh-6rem)] lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Drawer close, small screens only */}
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e3a9ad] px-1">
              Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="p-1.5 rounded-md text-[#f3d3d5] hover:bg-[#731217] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Section */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#e3a9ad] px-3 mb-1.5">
              Operations
            </div>
            <nav className="space-y-0.5">
              {mainNav.map((item) => {
                const active =
                  currentPath === item.id ||
                  (item.id === '/tenders' && currentPath.startsWith('/tenders/') && currentPath !== '/tenders/new');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.id}
                    aria-current={active ? 'page' : undefined}
                    className={itemClass(active)}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#8b151b]' : 'text-[#e3a9ad]'}`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        title={(item as {badgeTitle?: string}).badgeTitle}
                        className={`shrink-0 whitespace-nowrap text-[10.5px] font-mono px-1.5 py-0.5 rounded-md ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin & System Section */}
          {showAdminSection && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#e3a9ad] px-3 mb-1.5">
                Administration
              </div>
              <nav className="space-y-0.5">
                {adminNav.map((item) => {
                  const active = currentPath === item.id;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.id}
                      aria-current={active ? 'page' : undefined}
                      className={itemClass(active)}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#8b151b]' : 'text-[#e3a9ad]'}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Role & scope box at bottom */}
        <div className="shrink-0 p-3 bg-[#731217] rounded-md border border-[#a4262c] text-xs">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white">
            <span className="truncate">{ROLE_LABELS[currentUser.role]}</span>
            <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#5e0d12] border border-[#a4262c] text-white">
              {currentUser.region === 'ALL' ? 'ALL UAE' : currentUser.region}
            </span>
          </div>
          <div className="mt-1 text-[10.5px] text-[#e3a9ad] leading-snug">
            {ROLE_SCOPE_NOTE[currentUser.role]}
          </div>
        </div>
      </aside>
    </>
  );
};
