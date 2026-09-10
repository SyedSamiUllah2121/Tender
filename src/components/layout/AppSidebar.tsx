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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { can } from '../../lib/permissions';

export const AppSidebar: React.FC = () => {
  const router = useRouter();
  const currentPath = usePathname();
  const { currentUser } = useAuth();

  // Get live counts scoped for currentUser
  const tenders = tenderRepository.getTenders(currentUser);
  const activeCount = tenders.filter((t) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status)
  ).length;

  const now = new Date();
  const overdueFollowUps = tenders.filter(
    (t) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
      t.nextFollowUpAt &&
      new Date(t.nextFollowUpAt) < now
  ).length;

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
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: '/awarded',
      label: 'Awarded Projects',
      icon: Trophy,
      badge: awardedCount > 0 ? awardedCount : null,
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    },
    {
      id: '/followups',
      label: 'Follow-ups Worklist',
      icon: CalendarClock,
      badge: overdueFollowUps > 0 ? `${overdueFollowUps} due` : null,
      badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200/60 font-medium',
    },
    {
      id: '/reports',
      label: 'Performance Reports',
      icon: BarChart3,
      badge: null,
    },
  ];

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

  const isSuperAdminOrAdmin = can(currentUser, 'manage_admin');

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-60px)] p-3.5 flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Quick Action: New Tender */}
        {can(currentUser, 'create_tender') && (
          <button
            type="button"
            onClick={() => router.push('/tenders/new')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-red-200" />
            <span>New Tender Bid</span>
          </button>
        )}

        {/* Main Section */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#8b151b]/8 text-[#8b151b] font-semibold border-r-2 border-[#8b151b]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border-r-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-[#8b151b]' : 'text-slate-400'
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
        {isSuperAdminOrAdmin && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#8b151b]/8 text-[#8b151b] font-semibold border-r-2 border-[#8b151b]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border-r-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[#8b151b]' : 'text-slate-400'
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

      {/* Scope Status Box at bottom */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
          <span>Territory Scope</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
            {currentUser.region}
          </span>
        </div>
        <div className="mt-1 text-[10.5px] text-slate-400 leading-snug">
          {currentUser.role === 'USER'
            ? 'Restricted to owned and sourced tenders.'
            : 'UAE enterprise directory access enabled.'}
        </div>
      </div>
    </aside>
  );
};
