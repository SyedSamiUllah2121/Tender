'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { Notification } from '../../types';

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenCommandPalette }) => {
  const router = useRouter();
  const { currentUser, allUsers, switchUser, refreshData, dataVersion } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  useEffect(() => {
    setNotifications(tenderRepository.getNotifications(currentUser));
  }, [currentUser, dataVersion]);

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
    setCronMessage(`Follow-up check complete: ${result.count} new alert(s) logged.`);
    setTimeout(() => {
      setCronRunning(false);
      setTimeout(() => setCronMessage(null), 3500);
    }, 400);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#8b151b] border-b border-[#731217] text-white select-none shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push('/dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-white text-[#8b151b] flex items-center justify-center font-extrabold text-xs tracking-wider shadow-xs transition-colors relative">
            <span>IB</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#8b151b]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13.5px] tracking-tight text-white group-hover:text-red-100 transition-colors">
                INSPIRE BUILDERS
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                Commercial ERP
              </span>
            </div>
            <div className="text-[11px] text-red-200/90 font-normal tracking-tight">
              Abu Dhabi & Dubai Commercial Operations
            </div>
          </div>
        </div>

        {/* Center Search / Command Palette shortcut */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-black/20 hover:bg-black/30 text-white/90 hover:text-white rounded-lg border border-white/15 text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-red-200" />
              <span className="text-red-100/90 font-normal">Search tenders, clients, locations...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium font-mono bg-white/15 rounded border border-white/20 text-white shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Follow-up Cron Automation Button */}
          <button
            type="button"
            onClick={handleRunCron}
            disabled={cronRunning}
            title="Run daily follow-up automation check"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white border border-white/15 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-red-200 ${cronRunning ? 'animate-spin text-white' : ''}`} />
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
              className="relative p-2 rounded-lg hover:bg-white/15 text-white/90 hover:text-white border border-transparent hover:border-white/15 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#8b151b]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 duration-100">
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
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

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
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
                          !n.readAt ? 'bg-amber-50/30' : ''
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
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-md bg-white text-[#8b151b] font-bold text-[11px] flex items-center justify-center shadow-2xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white leading-none">{currentUser.name}</div>
                <div className="text-[10px] text-red-200 font-mono tracking-tight mt-0.5">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-red-200" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 duration-100">
                <div className="p-3 bg-slate-50/80 border-b border-slate-100">
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

                <div className="p-2 border-b border-slate-100">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Switch User (Audit Scoping)
                  </div>
                  <div className="space-y-0.5">
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          u.id === currentUser.id
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
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
        <div className="bg-[#5e0d12] text-white text-center text-xs py-1.5 font-medium px-4 border-t border-black/20">
          {cronMessage}
        </div>
      )}
    </header>
  );
};
