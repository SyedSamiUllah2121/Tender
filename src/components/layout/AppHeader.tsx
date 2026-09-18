'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Menu,
  MapPin,
  FileSpreadsheet,
  CalendarClock,
  ShieldAlert,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { can } from '../../lib/permissions';
import { ACTIVE_STATUSES, isPastFollowUpWindow } from '../../lib/followUpPolicy';
import { Notification, ROLE_LABELS } from '../../types';

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
  /** Opens the navigation drawer on screens too narrow for the sidebar. */
  onToggleNav: () => void;
  isNavOpen: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenCommandPalette,
  onToggleNav,
  isNavOpen,
}) => {
  const router = useRouter();
  const { currentUser, signOut, refreshData, dataVersion } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);
  const [lastCronAt, setLastCronAt] = useState<Date | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(tenderRepository.getNotifications(currentUser));
  }, [currentUser, dataVersion]);

  // A dropdown should close when you click away from it or press Escape,
  // rather than trapping you into clicking its trigger a second time.
  useEffect(() => {
    if (!showNotifications && !showUserMenu) return;
    const closeAll = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!menusRef.current?.contains(e.target as Node)) closeAll();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showUserMenu]);

  /*
    The corporate site runs a red strip of office addresses and phone numbers
    above its navigation. The internal equivalent of "where we are and how to
    reach us" is the slice of the pipeline this user can see and what is
    overdue inside it, so the strip carries those numbers instead.
    dataVersion is the repository's invalidation key.
  */
  const stats = useMemo(() => {
    const tenders = tenderRepository.getTenders(currentUser);
    const now = new Date();
    return {
      active: tenders.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      due: tenders.filter(
        (t) =>
          ACTIVE_STATUSES.includes(t.status) &&
          t.nextFollowUpAt &&
          new Date(t.nextFollowUpAt) < now
      ).length,
      pastDeadline: tenders.filter((t) => isPastFollowUpWindow(t, now)).length,
    };
  }, [currentUser, dataVersion]);

  const regionLabel = currentUser.region === 'ALL' ? 'ALL UAE' : currentUser.region;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAllRead = () => {
    tenderRepository.markAllNotificationsRead(currentUser);
    refreshData();
  };

  const handleNotificationClick = (notif: Notification) => {
    tenderRepository.markNotificationRead(currentUser, notif.id);
    refreshData();
    setShowNotifications(false);
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const handleRunCron = () => {
    setCronRunning(true);
    const result = tenderRepository.runFollowUpCron();
    refreshData();
    setLastCronAt(new Date());
    setCronMessage(
      `Follow-up check complete: ${result.dueCount} due, ${result.breachedCount} past the 2-month deadline.`
    );
    setTimeout(() => {
      setCronRunning(false);
      setTimeout(() => setCronMessage(null), 3500);
    }, 400);
  };

  return (
    <header className="sticky top-0 z-40 select-none">
      {/* Utility strip — the corporate site's red contact bar, carrying scope and workload */}
      <div className="on-brand bg-[var(--brand-primary)] text-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between gap-3 text-[11px] font-medium">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <span className="flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#e3a9ad]" />
              <span>
                Scope <span className="font-semibold">{regionLabel}</span>
              </span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#e3a9ad]" />
              <span>
                <span className="font-mono font-semibold">{stats.active}</span> active tenders
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <Link
              href="/followups"
              className="flex items-center gap-1.5 hover:underline underline-offset-2"
            >
              <CalendarClock className="w-3.5 h-3.5 text-[#e3a9ad]" />
              <span>
                <span className="font-mono font-semibold">{stats.due}</span> due
              </span>
            </Link>

            {can(currentUser, 'monitor_department') && (
              <Link
                href="/monitoring"
                title={`${stats.pastDeadline} past the 2-month deadline`}
                className="hidden md:flex items-center gap-1.5 hover:underline underline-offset-2"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#e3a9ad]" />
                <span>
                  <span className="font-mono font-semibold">{stats.pastDeadline}</span> past 2m
                </span>
              </Link>
            )}

            <span className="hidden lg:flex items-center gap-1.5 text-[#f3d3d5]">
              <Clock className="w-3.5 h-3.5 text-[#e3a9ad]" />
              <span>
                {lastCronAt
                  ? `Checked ${lastCronAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'No check run yet'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main bar — white, logo left, controls and primary action right */}
      <div className="bg-white border-b border-[var(--border)] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Navigation drawer toggle — the sidebar is hidden below lg */}
            <button
              type="button"
              onClick={onToggleNav}
              aria-label="Toggle navigation"
              aria-expanded={isNavOpen}
              aria-controls="app-sidebar"
              className="lg:hidden shrink-0 -ml-1 p-2 rounded-md text-[var(--text-700)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-900)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand & Identity */}
            <Link
              href="/dashboard"
              aria-label="Inspire Builders — Dashboard"
              className="flex items-center gap-3 min-w-0"
            >
              <img
                src="/logo.png"
                alt="Inspire Builders"
                width={2560}
                height={760}
                className="h-9 w-auto block shrink-0 self-center"
              />
              <span className="hidden lg:block border-l border-[var(--border)] pl-3 text-[11px] text-[var(--text-900)]">
                Tendering Department
              </span>
            </Link>
          </div>

          {/* Center Search / Command Palette shortcut */}
          <div className="flex-1 max-w-sm hidden md:block">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-canvas)] hover:bg-slate-100 text-[var(--text-500)] hover:text-[var(--text-700)] rounded-md border border-[var(--border)] text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[var(--text-400)]" />
                <span className="font-normal">Search tenders, clients, locations...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium font-mono bg-white rounded border border-[var(--border)] text-[var(--text-700)]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right side controls */}
          <div ref={menusRef} className="flex items-center gap-2 sm:gap-3">
            {/* Follow-up Cron Automation Button */}
            <button
              type="button"
              onClick={handleRunCron}
              disabled={cronRunning}
              title="Run daily follow-up automation check"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-white hover:bg-[var(--bg-canvas)] text-xs font-medium text-[var(--text-700)] border border-[var(--border)] transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[var(--text-500)] ${
                  cronRunning ? 'animate-spin text-[var(--brand-primary)]' : ''
                }`}
              />
              <span className="hidden sm:inline">Cron Check</span>
            </button>

            {/* Notifications dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 rounded-md hover:bg-[var(--bg-canvas)] text-[var(--text-700)] hover:text-[var(--text-900)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-md shadow-xl border border-slate-300 overflow-hidden z-50 animate-in fade-in-50 duration-100">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#8b151b] text-white font-mono">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium text-[#8b151b] hover:text-[#731217] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors flex gap-2.5 items-start ${
                            !n.readAt ? 'bg-amber-50' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'FOLLOWUP_DUE' ? (
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                            ) : n.type === 'AWARDED' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[12.5px] text-slate-900">
                              {n.title}
                            </div>
                            <div className="text-slate-500 mt-0.5 leading-snug line-clamp-2">
                              {n.body}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </div>
                          </div>
                          {!n.readAt && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary action, styled after the corporate site's "Get A Quote" button */}
            {can(currentUser, 'create_tender') && (
              <Link
                href="/tenders/new"
                className="inline-flex items-center gap-1.5 shrink-0 px-3 sm:px-4 py-2 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline whitespace-nowrap">New Tender Bid</span>
              </Link>
            )}

            {/* User switcher profile dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                aria-label={`Account menu — ${currentUser.name}, ${ROLE_LABELS[currentUser.role]}`}
                aria-expanded={showUserMenu}
                className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-md bg-white hover:bg-[var(--bg-canvas)] border border-[var(--border)] transition-colors cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded-md bg-[var(--brand-primary)] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden xl:block">
                  <div className="text-xs font-semibold text-[var(--text-900)] leading-none">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-500)] font-mono tracking-tight mt-0.5">
                    {ROLE_LABELS[currentUser.role]}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-400)]" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-md shadow-xl border border-slate-300 overflow-hidden z-50 animate-in fade-in-50 duration-100">
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Active Account
                    </div>
                    <div className="font-semibold text-sm text-slate-900 mt-0.5">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900 text-white">
                        {currentUser.role}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-200 text-slate-700">
                        {currentUser.region}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sign out</span>
                    </button>
                  </div>

                  <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Persistence: Local / Memory</span>
                    <button
                      type="button"
                      onClick={() => {
                        tenderRepository.resetToSeed();
                        refreshData();
                        setShowUserMenu(false);
                      }}
                      className="text-[var(--brand-primary)] hover:underline font-medium cursor-pointer"
                    >
                      Reset Seed Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating feedback message for cron or notifications */}
      {cronMessage && (
        <div className="bg-[#5e0d12] text-white text-center text-xs py-1.5 font-medium px-4">
          {cronMessage}
        </div>
      )}
    </header>
  );
};
