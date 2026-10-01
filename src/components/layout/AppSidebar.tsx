'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { personInitial } from '../../lib/initials';

interface AppSidebarProps {
  /** Drawer state; only meaningful below the lg breakpoint. */
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const currentPath = usePathname();
  const { currentUser, dataVersion } = useAuth();

  /*
    The highlight moves the moment an item is clicked, not when the next page
    has finished rendering, which on the dashboard can take most of a second.
    pendingPath holds the clicked item until the route catches up.
  */
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  useEffect(() => {
    setPendingPath(null);
  }, [currentPath]);
  useEffect(() => {
    if (!pendingPath) return;
    // A navigation that never lands must not leave the highlight stranded.
    const id = window.setTimeout(() => setPendingPath(null), 6000);
    return () => window.clearTimeout(id);
  }, [pendingPath]);
  const shownPath = pendingPath ?? currentPath;

  // Live counts, recomputed when the data changes rather than on every render.
  const { activeCount, overdueFollowUps, pastDeadline, awardedCount } = useMemo(() => {
    const tenders = tenderRepository.getTenders(currentUser);
    const now = new Date();
    return {
      activeCount: tenders.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      overdueFollowUps: tenders.filter(
        (t) => ACTIVE_STATUSES.includes(t.status) && t.nextFollowUpAt && new Date(t.nextFollowUpAt) < now
      ).length,
      // Tenders past the mandatory 2-month window with no clear status yet.
      pastDeadline: tenders.filter((t) => isPastFollowUpWindow(t, now)).length,
      awardedCount: tenders.filter((t) => t.status === 'AWARDED').length,
    };
  }, [currentUser, dataVersion]);

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
      badgeColor: 'bg-black/25 text-white',
    },
    {
      id: '/awarded',
      label: 'Awarded Projects',
      icon: Trophy,
      badge: awardedCount > 0 ? awardedCount : null,
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      id: '/followups',
      label: 'Follow-ups Worklist',
      icon: CalendarClock,
      badge: overdueFollowUps > 0 ? `${overdueFollowUps} due` : null,
      badgeColor: 'bg-amber-400 text-[#3f2d00]',
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
    badgeColor: 'bg-[#141414] text-white',
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

  const isActive = (id: string) =>
    shownPath === id ||
    (id === '/tenders' && shownPath.startsWith('/tenders/') && shownPath !== '/tenders/new');
  const activeId = [...mainNav, ...(showAdminSection ? adminNav : [])].find((i) => isActive(i.id))?.id ?? null;

  /*
    The white highlight is one element that moves to the active item with a
    CSS transform transition. The browser runs that on the compositor, so it
    keeps gliding even while the next page is busy rendering; a JavaScript
    spring froze for exactly that stretch.
  */
  const navRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const [pillAnimated, setPillAnimated] = useState(false);
  useLayoutEffect(() => {
    const root = navRef.current;
    const measure = () => {
      const link = activeId ? root?.querySelector<HTMLElement>(`[data-nav="${activeId}"]`) : null;
      setPill(link ? { top: link.offsetTop, height: link.offsetHeight } : null);
    };
    measure();
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [activeId]);
  // Place it without a slide the first time, then animate every move after.
  useEffect(() => {
    if (pill && !pillAnimated) {
      const id = requestAnimationFrame(() => setPillAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [pill, pillAnimated]);

  const followLink = (id: string) => (e: React.MouseEvent) => {
    // New-tab and similar clicks do not navigate this page.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (id !== currentPath) setPendingPath(id);
  };

  const itemClass = (active: boolean) =>
    `group relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
      active
        ? 'text-[#8b151b] font-semibold'
        : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
    }`;

  const iconClass = (active: boolean) =>
    `w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#8b151b]' : 'text-white/60 group-hover:text-white'}`;

  const sectionLabel = 'text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50 px-3 mb-2';

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
        className={`fixed top-0 left-0 z-50 h-dvh w-60 shrink-0 overflow-y-auto bg-gradient-to-b from-[#8b151b] to-[#6f1016] border-r border-black/10 p-3.5 flex flex-col justify-between gap-6 select-none transition-transform duration-200 lg:sticky lg:top-24 lg:z-auto lg:h-[calc(100dvh-6rem)] lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div ref={navRef} className="relative space-y-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-0 z-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.12)]"
            style={{
              height: pill?.height ?? 0,
              transform: `translateY(${pill?.top ?? 0}px)`,
              opacity: pill ? 1 : 0,
              transition: pillAnimated
                ? 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), height 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease'
                : 'none',
              willChange: 'transform',
            }}
          />
          {/* Drawer close, small screens only */}
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50 px-1">
              Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Section */}
          <div>
            <div className={sectionLabel}>Operations</div>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const active = isActive(item.id);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.id}
                    data-nav={item.id}
                    onClick={followLink(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={itemClass(active)}
                  >
                    <span className="relative z-10 flex items-center gap-2.5 min-w-0 transition-transform duration-150 group-hover:translate-x-0.5">
                      <Icon className={iconClass(active)} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        title={(item as {badgeTitle?: string}).badgeTitle}
                        className={`relative z-10 shrink-0 whitespace-nowrap text-[10.5px] font-mono font-semibold tabular-nums min-w-[1.5rem] text-center px-1.5 py-0.5 rounded-full ${
                          // A see-through badge vanishes on the white active pill.
                          active && item.badgeColor?.includes('bg-black/25')
                            ? 'bg-[#8b151b] text-white'
                            : item.badgeColor
                        }`}
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
              <div className={sectionLabel}>Administration</div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const active = isActive(item.id);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.id}
                      data-nav={item.id}
                      onClick={followLink(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={itemClass(active)}
                    >
                      <span className="relative z-10 flex items-center gap-2.5 min-w-0 transition-transform duration-150 group-hover:translate-x-0.5">
                        <Icon className={iconClass(active)} />
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
        <div className="shrink-0 p-3 rounded-xl bg-white/10 border border-white/15 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-[#8b151b] font-bold text-xs flex items-center justify-center shrink-0">
              {personInitial(currentUser.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-white truncate">{currentUser.name}</div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/65">
                <span className="truncate">{ROLE_LABELS[currentUser.role]}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0 font-semibold text-white/85">
                  {currentUser.region === 'ALL'
                    ? 'All UAE'
                    : currentUser.region === 'ABU_DHABI'
                    ? 'Abu Dhabi'
                    : 'Dubai'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] text-white/60 leading-snug">
            {ROLE_SCOPE_NOTE[currentUser.role]}
          </div>
        </div>
      </aside>
    </>
  );
};
