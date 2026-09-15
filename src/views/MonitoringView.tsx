'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Users,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatAED } from '../lib/money';
import { can } from '../lib/permissions';
import {
  ACTIVE_STATUSES,
  DeadlineState,
  MonitorRow,
  breachedByOwner,
  FOLLOW_UP_WINDOW_MONTHS,
} from '../lib/followUpPolicy';
import { ROLE_LABELS } from '../types';

type Lens = 'ACTIVE' | 'BREACHED' | 'OVERDUE' | 'DUE_SOON' | 'ALL';

const fmtDate = (iso: string | null) => (iso ? iso.substring(0, 10) : '—');

const STATE_STYLE: Record<DeadlineState, { label: string; cls: string }> = {
  BREACHED: { label: 'Past 2-month deadline', cls: 'bg-red-50 text-red-700 border-red-300' },
  DUE_SOON: { label: 'Deadline approaching', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  ON_TRACK: { label: 'Within window', cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  RESOLVED: { label: 'Status recorded', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  NOT_SUBMITTED: { label: 'Not submitted', cls: 'bg-slate-50 text-slate-500 border-slate-300' },
};

export const MonitoringView: React.FC = () => {
  const router = useRouter();
  const { currentUser, allUsers, dataVersion } = useAuth();
  const [lens, setLens] = useState<Lens>('ACTIVE');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const allowed = can(currentUser, 'monitor_department');

  const rows = useMemo<MonitorRow[]>(() => {
    if (!allowed) return [];
    return tenderRepository.getMonitorRows(currentUser);
  }, [currentUser, dataVersion, allowed]);

  const counts = useMemo(
    () => ({
      active: rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
      breached: rows.filter((r) => r.state === 'BREACHED').length,
      overdue: rows.filter((r) => r.followUpOverdue).length,
      dueSoon: rows.filter((r) => r.state === 'DUE_SOON').length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    let list = rows;

    if (lens === 'ACTIVE') list = list.filter((r) => ACTIVE_STATUSES.includes(r.status));
    else if (lens === 'BREACHED') list = list.filter((r) => r.state === 'BREACHED');
    else if (lens === 'OVERDUE') list = list.filter((r) => r.followUpOverdue);
    else if (lens === 'DUE_SOON') list = list.filter((r) => r.state === 'DUE_SOON');

    if (ownerFilter !== 'ALL') list = list.filter((r) => r.ownerId === ownerFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.tenderNumber).includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, lens, ownerFilter, search]);

  const byOwner = useMemo(() => breachedByOwner(rows), [rows]);

  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 rounded-md bg-white border border-[var(--border)] text-center space-y-2">
        <Lock className="w-6 h-6 mx-auto text-slate-400" />
        <h1 className="text-sm font-bold text-slate-900">Monitoring is restricted</h1>
        <p className="text-xs text-slate-500">
          Only the Manager, Admin 1 and Admin 2 can monitor the whole department. You are signed in
          as {currentUser.name} ({ROLE_LABELS[currentUser.role]}).
        </p>
      </div>
    );
  }

  const tiles: Array<{ id: Lens; label: string; value: number; hint: string; dot: string }> = [
    {
      id: 'ACTIVE',
      label: 'Active',
      value: counts.active,
      hint: 'Submitted, under review or on hold.',
      dot: 'bg-slate-400',
    },
    {
      id: 'OVERDUE',
      label: 'Overdue follow-ups',
      value: counts.overdue,
      hint: 'The scheduled touchpoint date has passed.',
      dot: 'bg-rose-500',
    },
    {
      id: 'DUE_SOON',
      label: 'Deadline approaching',
      value: counts.dueSoon,
      hint: '14 days or less left in the follow-up window.',
      dot: 'bg-amber-500',
    },
    {
      id: 'BREACHED',
      label: `Past ${FOLLOW_UP_WINDOW_MONTHS}-month deadline`,
      value: counts.breached,
      hint: 'Window closed with no clear status recorded.',
      dot: 'bg-[#8b151b]',
    },
  ];

  return (
    <div className="space-y-4 pb-16">
      <div>
        <h1 className="text-base font-semibold text-slate-900">
          Management &amp; Admin Monitoring
        </h1>
        <p className="text-xs text-slate-500">
          Every active tender with its assigned salesperson, dates, follow-up history and{' '}
          {FOLLOW_UP_WINDOW_MONTHS}-month deadline. Every tender stays engaged until it is Awarded,
          Rejected, or confirmed Still Under Process.
        </p>
      </div>

      {/* Tabs over the table below */}
      <div className="flex flex-wrap items-center border-b border-slate-300">
        {tiles.map((tile) => {
          const active = lens === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setLens(tile.id)}
              title={tile.hint}
              className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-xs transition-colors cursor-pointer ${
                active
                  ? 'border-[#8b151b] text-slate-900 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tile.dot}`} />
              <span>{tile.label}</span>
              <span className="font-mono tabular-nums text-slate-400">{tile.value}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500">
        {tiles.find((t) => t.id === lens)?.hint}
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tender no, client, location or salesperson..."
          className="flex-1 text-xs p-2 rounded-md border border-slate-400 bg-white"
        />
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="text-xs p-2 rounded-md border border-slate-400 bg-white font-medium"
        >
          <option value="ALL">All salespersons</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={lens}
          onChange={(e) => setLens(e.target.value as Lens)}
          className="text-xs p-2 rounded-md border border-slate-400 bg-white font-medium"
        >
          <option value="ACTIVE">Active pipeline</option>
          <option value="OVERDUE">Pending / overdue follow-ups</option>
          <option value="DUE_SOON">Deadline approaching</option>
          <option value="BREACHED">Past 2-month deadline</option>
          <option value="ALL">Everything</option>
        </select>
      </div>

      {/* Breach load per salesperson */}
      {byOwner.length > 0 && (
        <div className="bg-white rounded-md border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Awaiting a clear status, by salesperson</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {byOwner.map((o) => (
              <button
                key={o.ownerId}
                type="button"
                onClick={() => {
                  setOwnerFilter(o.ownerId);
                  setLens('BREACHED');
                }}
                className="px-2.5 py-1 rounded-md border border-red-300 bg-red-50 text-red-800 text-[11px] font-semibold cursor-pointer hover:bg-red-100 transition-colors"
              >
                {o.ownerName}: {o.count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring table */}
      <div className="bg-white rounded-md border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-gray-50 uppercase font-bold text-[10.5px] text-gray-500 tracking-wider whitespace-nowrap">
                <th className="p-3">Tender</th>
                <th className="p-3">Assigned Salesperson</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Target Date</th>
                <th className="p-3">Last Follow-up</th>
                <th className="p-3">Next Follow-up</th>
                <th className="p-3 text-center"># FU</th>
                <th className="p-3">2-Month Deadline</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs text-gray-400">
                    No tenders match this view.
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const style = STATE_STYLE[r.state];
                  return (
                    <tr
                      key={r.tender.id}
                      className={`hover:bg-gray-50 transition ${
                        r.state === 'BREACHED' ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="p-3 min-w-[13rem]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#8b151b]">
                            #{r.tenderNumber}
                          </span>
                          <span className="font-semibold text-gray-900 truncate max-w-[9rem]">
                            {r.clientName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {r.location} · {formatAED(r.tender.tenderAmount)}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap font-medium text-gray-800">
                        {r.ownerName}
                      </td>

                      <td className="p-3 font-mono text-[11px] text-gray-600">
                        {fmtDate(r.submittedAt)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-gray-600">
                        {fmtDate(r.targetDate)}
                      </td>

                      <td className="p-3 font-mono text-[11px] text-gray-600">
                        {fmtDate(r.lastFollowUpAt)}
                        {r.daysSinceLastFollowUp !== null && (
                          <div className="text-[10px] text-gray-400">
                            {r.daysSinceLastFollowUp}d ago
                          </div>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        <span className={r.followUpOverdue ? 'text-red-700 font-bold' : 'text-gray-600'}>
                          {fmtDate(r.nextFollowUpAt)}
                        </span>
                        {r.followUpOverdue && (
                          <div className="text-[10px] text-red-600 font-semibold">Overdue</div>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-gray-800">
                        {r.followUpCount}
                      </td>

                      <td className="p-3 min-w-[11rem]">
                        <div className="font-mono text-[11px] text-gray-700">
                          {fmtDate(r.deadlineAt)}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${style.cls}`}
                        >
                          {style.label}
                          {r.daysToDeadline !== null && r.state !== 'RESOLVED' && (
                            <>
                              {' · '}
                              {r.daysToDeadline < 0
                                ? `${Math.abs(r.daysToDeadline)}d over`
                                : `${r.daysToDeadline}d left`}
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/tenders/${r.tender.id}`)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                          title="Open tender"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Showing {visible.length} of {rows.length} tenders in scope.
      </p>
    </div>
  );
};
