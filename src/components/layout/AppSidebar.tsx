'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Trophy,
  CalendarClock,
  BarChart3,
  FileUp,
  Users,
  GitFork,
  Briefcase,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { can, hasFullAccess } from '../../lib/permissions';
import { ACTIVE_STATUSES, isPastFollowUpWindow } from '../../lib/followUpPolicy';
import { ROLE_LABELS, ROLE_SCOPE_NOTE } from '../../types';

export const AppSidebar: React.FC = () => {
  const router = useRouter();
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
    badge: pastDeadline > 0 ? `${pastDeadline} past 2m` : null,
    badgeColor: 'bg-[#141414] text-white font-bold',
  };

  if (can(currentUser, 'monitor_department')) {
    mainNav.splice(4, 0, monitorNav);
  }

  const adminNav = [
    {
      id: '/admin/import',
      label: 'Excel Migration',
      icon: FileUp,
    },
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

  return (
    <aside className="w-60 shrink-0 bg-[#8b151b] border-r border-[#5e0d12] min-h-[calc(100vh-60px)] p-3.5 flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Quick Action: New Tender */}
        {can(currentUser, 'create_tender') && (
          <button
            type="button"
            onClick={() => router.push('/tenders/new')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold text-[#8b151b] bg-white hover:bg-[#f7e7e8] transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#8b151b]" />
            <span>New Tender Bid</span>
          </button>
        )}

        {/* Main Section */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#e3a9ad] px-3 mb-1.5">
            Operations
          </div>
          <nav className="space-y-0.5">
            {mainNav.map((item) => {
              const active =
                currentPath === item.id ||
                (item.id === '/tenders' && currentPath.startsWith('/tenders') && currentPath !== '/tenders/new');
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-[#8b151b] font-semibold border-r-2 border-white'
                      : 'text-[#f3d3d5] hover:text-white hover:bg-[#731217] font-medium border-r-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-[#8b151b]' : 'text-[#e3a9ad]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10.5px] font-mono px-1.5 py-0.2 rounded-md ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
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
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-white text-[#8b151b] font-semibold border-r-2 border-white'
                        : 'text-[#f3d3d5] hover:text-white hover:bg-[#731217] font-medium border-r-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[#8b151b]' : 'text-[#e3a9ad]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Role & scope box at bottom */}
      <div className="p-3 bg-[#731217] rounded-md border border-[#a4262c] text-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white">
          <span>{ROLE_LABELS[currentUser.role]}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#5e0d12] border border-[#a4262c] text-white">
            {currentUser.region === 'ALL' ? 'ALL UAE' : currentUser.region}
          </span>
        </div>
        <div className="mt-1 text-[10.5px] text-[#e3a9ad] leading-snug">
          {ROLE_SCOPE_NOTE[currentUser.role]}
        </div>
      </div>
    </aside>
  );
};
