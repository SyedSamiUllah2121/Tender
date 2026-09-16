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
import { hasFullAccess } from '../lib/permissions';
import {
  ACTIVE_STATUSES,
  FOLLOW_UP_WINDOW_MONTHS,
  clampToWindow,
  deadlineState,
  followUpDeadline,
} from '../lib/followUpPolicy';

const BUCKETS = [
  {
    key: 'breached' as const,
    label: `Past ${FOLLOW_UP_WINDOW_MONTHS}-month deadline`,
    dot: 'bg-[#8b151b]',
    hint: 'Past the follow-up window with no clear status. Record Awarded, Rejected, or Still Under Process.',
  },
  {
    key: 'overdue' as const,
    label: 'Overdue',
    dot: 'bg-rose-500',
    hint: 'The scheduled touchpoint date has passed.',
  },
  {
    key: 'this_week' as const,
    label: 'Due this week',
    dot: 'bg-amber-500',
    hint: 'Scheduled within the next 7 days.',
  },
  {
    key: 'upcoming' as const,
    label: 'Upcoming',
    dot: 'bg-slate-400',
    hint: 'Scheduled beyond this week.',
  },
];

type BucketKey = (typeof BUCKETS)[number]['key'];

export const FollowUpsView: React.FC = () => {
  const router = useRouter();
  const { currentUser, dataVersion, refreshData } = useAuth();
  const [teamWide, setTeamWide] = useState(hasFullAccess(currentUser));
  // Null until a tab is chosen, so the view can open on whichever bucket
  // actually holds work rather than on a fixed, often empty, one.
  const [pickedBucket, setPickedBucket] = useState<BucketKey | null>(null);

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
    list = list.filter(
      (t) =>
        ACTIVE_STATUSES.includes(t.status) &&
        (t.nextFollowUpAt || deadlineState(t, now).state === 'BREACHED')
    );

    if (hasFullAccess(currentUser) && !teamWide) {
      list = list.filter((t) => t.ownerId === currentUser.id);
    }
    return list;
  }, [currentUser, dataVersion, teamWide]);

  // Buckets
  const buckets = useMemo(() => {
    const breached: Tender[] = [];
    const overdue: Tender[] = [];
    const thisWeek: Tender[] = [];
    const upcoming: Tender[] = [];

    tenders.forEach((t) => {
      // Past the mandatory 2-month window without a clear status: these need a
      // decision (Awarded / Rejected / Still Under Process), not just a call.
      if (deadlineState(t, now).state === 'BREACHED') {
        breached.push(t);
        return;
      }
      if (!t.nextFollowUpAt) return;
      const d = new Date(t.nextFollowUpAt);
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
      new Date(a.nextFollowUpAt || a.submittedAt || 0).getTime() -
      new Date(b.nextFollowUpAt || b.submittedAt || 0).getTime();

    return {
      breached: breached.sort(sortFn),
      overdue: overdue.sort(sortFn),
      thisWeek: thisWeek.sort(sortFn),
      upcoming: upcoming.sort(sortFn),
    };
  }, [tenders, now, weekFromNow]);

  const counts = {
    breached: buckets.breached.length,
    overdue: buckets.overdue.length,
    this_week: buckets.thisWeek.length,
    upcoming: buckets.upcoming.length,
  };

  // Open on the most urgent bucket that has anything in it; BUCKETS is already
  // ordered by urgency. Falls back to the first tab when there is no work at all.
  const activeBucket =
    pickedBucket ?? BUCKETS.find((b) => counts[b.key] > 0)?.key ?? BUCKETS[0].key;

  const activeList =
    activeBucket === 'breached'
      ? buckets.breached
      : activeBucket === 'overdue'
      ? buckets.overdue
      : activeBucket === 'this_week'
      ? buckets.thisWeek
      : buckets.upcoming;

  // Handle inline log submit
  const selectedDeadline = selectedTender ? followUpDeadline(selectedTender) : null;
  const deadlineISO = selectedDeadline ? selectedDeadline.toISOString().substring(0, 10) : null;

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTender || !outcome.trim()) return;

    setSubmitting(true);
    try {
      const requested = nextActionDate ? new Date(nextActionDate) : null;
      tenderRepository.addFollowUp(currentUser, selectedTender.id, {
        method,
        outcome,
        nextActionAt: requested ? clampToWindow(selectedTender, requested).toISOString() : null,
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
          <h1 className="text-base font-semibold text-slate-900">
            Client Follow-up Worklist
          </h1>
          <p className="text-xs text-slate-500">
            Tenders due a follow-up, and those past the 2-month deadline.
          </p>
        </div>

        {hasFullAccess(currentUser) && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-md border border-slate-300 cursor-pointer">
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

      {/* Buckets, as tabs over the list below */}
      <div className="flex flex-wrap items-center border-b border-slate-300">
        {BUCKETS.map((b) => {
          const on = activeBucket === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setPickedBucket(b.key)}
              className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-xs transition-colors cursor-pointer ${
                on
                  ? 'border-[#8b151b] text-slate-900 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
              <span>{b.label}</span>
              <span className="font-mono tabular-nums text-slate-400">{counts[b.key]}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500">
        {BUCKETS.find((b) => b.key === activeBucket)?.hint}
      </p>

      {/* Main List */}
      <div className="bg-white rounded-md border border-[var(--border)] divide-y divide-slate-200">
        {activeList.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No tenders in this follow-up category.
          </div>
        ) : (
          activeList.map((tender) => {
            const nextDate = tender.nextFollowUpAt ? new Date(tender.nextFollowUpAt) : null;
            const diffDays = nextDate
              ? Math.round((nextDate.getTime() - now.getTime()) / 86400000)
              : null;
            const isLate = diffDays !== null && diffDays < 0;
            const { state, daysToDeadline } = deadlineState(tender, now);
            const pastWindow = state === 'BREACHED';

            const waText = `Dear ${tender.clientNameRaw}, following up on our commercial proposal for ${tender.location} (Tender #${tender.tenderNumber}) from Inspire Builders General Contracting. Kindly let us know if you require any clarifications.`;
            const waUrl = getWhatsAppUrl('+971500000000', waText);

            return (
              <div
                key={tender.id}
                className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                    {pastWindow && (
                      <span className="px-1.5 py-0.5 rounded border border-red-300 bg-red-50 text-red-800 text-[10px] font-bold uppercase tracking-wide">
                        {FOLLOW_UP_WINDOW_MONTHS}-month deadline passed
                      </span>
                    )}
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

                  {pastWindow && (
                    <div className="text-[11px] text-red-700 font-medium">
                      Submitted {tender.submittedAt?.substring(0, 10)} — record a clear status:
                      Awarded, Rejected, or Still Under Process.
                    </div>
                  )}

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
                        isLate || pastWindow ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {diffDays === null
                        ? 'No touchpoint scheduled'
                        : isLate
                        ? `${Math.abs(diffDays)} days overdue`
                        : `Due in ${diffDays} days`}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {tender.nextFollowUpAt
                        ? tender.nextFollowUpAt.substring(0, 10)
                        : 'Deadline ' + (followUpDeadline(tender)?.toISOString().substring(0, 10) || '—')}
                    </div>
                    {daysToDeadline !== null && state !== 'RESOLVED' && (
                      <div className="text-[10px] font-mono text-slate-500">
                        {daysToDeadline < 0
                          ? `${Math.abs(daysToDeadline)}d past deadline`
                          : `${daysToDeadline}d left in window`}
                      </div>
                    )}
                  </div>

                  {/* Direct WhatsApp Pre-filled link */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
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
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Touchpoint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/tenders/${tender.id}`)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
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
          <div className="bg-white rounded-md shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-[11px] font-medium text-slate-500">
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
                  className="w-full p-2 rounded-md border border-slate-400 bg-white font-medium"
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
                  className="w-full p-2 rounded-md border border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Schedule Next Follow-up (defaults to +30 days)
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  max={deadlineISO || undefined}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-400 bg-white"
                />
                {deadlineISO && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Follow-up window closes {deadlineISO}. A later date is pulled back to the
                    deadline, where a clear status must be recorded.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTender(null)}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] cursor-pointer transition-colors"
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
