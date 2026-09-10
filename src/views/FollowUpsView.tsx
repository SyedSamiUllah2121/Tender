'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Phone,
  MessageSquare,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { Tender, FollowUpMethod } from '../types';
import { formatAED } from '../lib/money';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getWhatsAppUrl } from '../lib/notify/deepLink';

export const FollowUpsView: React.FC = () => {
  const router = useRouter();
  const { currentUser, dataVersion, refreshData } = useAuth();
  const [teamWide, setTeamWide] = useState(currentUser.role !== 'USER');
  const [activeBucket, setActiveBucket] = useState<'overdue' | 'this_week' | 'upcoming'>('overdue');

  // Inline Log Form state
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [method, setMethod] = useState<FollowUpMethod>('WhatsApp');
  const [outcome, setOutcome] = useState('');
  const [nextActionDate, setNextActionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().substring(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  // Load tenders requiring follow-up
  const tenders = useMemo(() => {
    let list = tenderRepository.getTenders(currentUser);
    // Active pipeline only
    list = list.filter((t) => ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) && t.nextFollowUpAt);

    if (currentUser.role !== 'USER' && !teamWide) {
      list = list.filter((t) => t.ownerId === currentUser.id);
    }
    return list;
  }, [currentUser, dataVersion, teamWide]);

  // Buckets
  const buckets = useMemo(() => {
    const overdue: Tender[] = [];
    const thisWeek: Tender[] = [];
    const upcoming: Tender[] = [];

    tenders.forEach((t) => {
      const d = new Date(t.nextFollowUpAt!);
      if (d < now) {
        overdue.push(t);
      } else if (d <= weekFromNow) {
        thisWeek.push(t);
      } else {
        upcoming.push(t);
      }
    });

    // Sort by earliest date first
    const sortFn = (a: Tender, b: Tender) =>
      new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime();

    return {
      overdue: overdue.sort(sortFn),
      thisWeek: thisWeek.sort(sortFn),
      upcoming: upcoming.sort(sortFn),
    };
  }, [tenders, now, weekFromNow]);

  const activeList =
    activeBucket === 'overdue'
      ? buckets.overdue
      : activeBucket === 'this_week'
      ? buckets.thisWeek
      : buckets.upcoming;

  // Handle inline log submit
  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTender || !outcome.trim()) return;

    setSubmitting(true);
    try {
      tenderRepository.addFollowUp(currentUser, selectedTender.id, {
        method,
        outcome,
        nextActionAt: nextActionDate || null,
      });
      refreshData();
      setSelectedTender(null);
      setOutcome('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Title & Team Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Client Follow-up Worklist
          </h1>
          <p className="text-xs text-slate-500">
            Prioritized touchpoint schedule to keep active bids warm and prevent deal slippage
          </p>
        </div>

        {currentUser.role !== 'USER' && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-xs">
            <input
              type="checkbox"
              checked={teamWide}
              onChange={(e) => setTeamWide(e.target.checked)}
              className="rounded text-[#8b151b] focus:ring-[#8b151b]"
            />
            <span>Show Entire Team Worklist</span>
          </label>
        )}
      </div>

      {/* 3 Buckets Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Overdue */}
        <div
          onClick={() => setActiveBucket('overdue')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeBucket === 'overdue'
              ? 'bg-red-50/90 border-red-300 ring-2 ring-red-500'
              : 'bg-white border-gray-200 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-red-900 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Overdue Follow-ups</span>
            </div>
            <span className="text-lg font-black text-red-700 font-mono">
              {buckets.overdue.length}
            </span>
          </div>
          <p className="text-[11px] text-red-700/80 mt-1">
            Immediate touchpoint past schedule
          </p>
        </div>

        {/* Due This Week */}
        <div
          onClick={() => setActiveBucket('this_week')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeBucket === 'this_week'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Due This Week</span>
            </div>
            <span className="text-lg font-black text-amber-700 font-mono">
              {buckets.thisWeek.length}
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">Scheduled in the next 7 days</p>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setActiveBucket('upcoming')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeBucket === 'upcoming'
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>Upcoming</span>
            </div>
            <span className="text-lg font-black text-blue-700 font-mono">
              {buckets.upcoming.length}
            </span>
          </div>
          <p className="text-[11px] text-blue-700/80 mt-1">Scheduled for future weeks</p>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs divide-y divide-gray-100">
        {activeList.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No tenders in this follow-up category.
          </div>
        ) : (
          activeList.map((tender) => {
            const nextDate = new Date(tender.nextFollowUpAt!);
            const diffDays = Math.round((nextDate.getTime() - now.getTime()) / 86400000);
            const isLate = diffDays < 0;

            const waText = `Dear ${tender.clientNameRaw}, following up on our commercial proposal for ${tender.location} (Tender #${tender.tenderNumber}) from Inspire Builders General Contracting. Kindly let us know if you require any clarifications.`;
            const waUrl = getWhatsAppUrl('+971500000000', waText);

            return (
              <div
                key={tender.id}
                className="p-4 hover:bg-gray-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Tender details */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#8b151b]">
                      #{tender.tenderNumber}
                    </span>
                    <span className="font-bold text-sm text-gray-900 truncate">
                      {tender.clientNameRaw}
                    </span>
                    <StatusBadge status={tender.status} size="sm" />
                  </div>

                  <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                    <span>{tender.location}</span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {formatAED(tender.tenderAmount)}
                    </span>
                    <span>•</span>
                    <span>Owner: {tender.owner?.name || 'Unassigned'}</span>
                  </div>

                  {tender.remarks && (
                    <div className="text-[11px] text-gray-500 italic truncate max-w-lg">
                      Last note: {tender.remarks}
                    </div>
                  )}
                </div>

                {/* Due status & Quick Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isLate ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {isLate ? `${Math.abs(diffDays)} days overdue` : `Due in ${diffDays} days`}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {tender.nextFollowUpAt!.substring(0, 10)}
                    </div>
                  </div>

                  {/* Direct WhatsApp Pre-filled link */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                    title="Send WhatsApp Follow-up message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>

                  {/* Inline Log Follow-up Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTender(tender);
                      setOutcome('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Touchpoint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/tenders/${tender.id}`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                    title="View Tender Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inline Modal to Log Follow-up without navigating away */}
      {selectedTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b151b]">
                  Log Client Touchpoint
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  Tender #{selectedTender.tenderNumber}: {selectedTender.clientNameRaw}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTender(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Contact Channel
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as FollowUpMethod)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white font-medium"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Call">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Visit">In-Person Site / Office Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Outcome & Discussion Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Client confirmed consultant is finalizing BOQ comparisons..."
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Schedule Next Follow-up (Defaults to +30 days)
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTender(null)}
                  className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] cursor-pointer transition-colors shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
