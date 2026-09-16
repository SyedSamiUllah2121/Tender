'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
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
    setCronMessage(
      `Follow-up check complete: ${result.dueCount} due, ${result.breachedCount} past the 2-month deadline.`
    );
    setTimeout(() => {
      setCronRunning(false);
      setTimeout(() => setCronMessage(null), 3500);
    }, 400);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0d0d0d] border-b border-[#333333] text-white select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
        {/* Navigation drawer toggle — the sidebar is hidden below lg */}
        <button
          type="button"
          onClick={onToggleNav}
          aria-label="Toggle navigation"
          aria-expanded={isNavOpen}
          aria-controls="app-sidebar"
          className="lg:hidden shrink-0 -ml-1 p-2 rounded-md text-[#d4d4d4] hover:bg-[#1f1f1f] hover:text-white border border-transparent hover:border-[#333333] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand & Identity */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push('/dashboard')}
        >
          <img
            src="/logo.png"
            alt="Inspire Builders"
            width={930}
            height={260}
            className="h-9 w-auto block shrink-0 self-center"
          />
          <div className="hidden lg:block border-l border-[#333333] pl-3 text-[11px] text-[#9a9a9a]">
            Tendering Department
          </div>
        </div>

        {/* Center Search / Command Palette shortcut */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-[#d4d4d4] hover:text-white rounded-md border border-[#333333] text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#9a9a9a]" />
              <span className="text-[#b5b5b5] font-normal">Search tenders, clients, locations...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium font-mono bg-[#1f1f1f] rounded border border-[#404040] text-white">
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2b2b2b] text-xs font-medium text-white border border-[#333333] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#b5b5b5] ${cronRunning ? 'animate-spin text-white' : ''}`} />
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
              className="relative p-2 rounded-md hover:bg-[#1f1f1f] text-[#d4d4d4] hover:text-white border border-transparent hover:border-[#333333] transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0d0d0d]" />
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

          {/* User switcher profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2b2b2b] border border-[#333333] transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-md bg-[#c8202a] text-white font-bold text-[11px] flex items-center justify-center">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white leading-none">{currentUser.name}</div>
                <div className="text-[10px] text-[#9a9a9a] font-mono tracking-tight mt-0.5">
                  {ROLE_LABELS[currentUser.role]}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9a9a9a]" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-md shadow-xl border border-slate-300 overflow-hidden z-50 animate-in fade-in-50 duration-100">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Active Account
                  </div>
                  <div className="font-semibold text-sm text-slate-900 mt-0.5">{currentUser.name}</div>
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

      {/* Floating feedback message for cron or notifications */}
      {cronMessage && (
        <div className="bg-[#5e0d12] text-white text-center text-xs py-1.5 font-medium px-4 border-t border-[#5e0d12]">
          {cronMessage}
        </div>
      )}
    </header>
  );
};
