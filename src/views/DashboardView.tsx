'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  FileText,
  Banknote,
  Activity,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import {
  AreaGradient,
  CHART_COLORS,
  ChartEmpty,
  ChartTooltip,
  RESIZE_DEBOUNCE,
  SMOOTH,
  TOOLTIP_ORDER,
  TruncatedTick,
  axisProps,
  barCursor,
  compactNumber,
  gridProps,
  legendProps,
  lineCursor,
  popDot,
  DeferredChart,
} from '../components/charts/chartKit';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { formatCompact, formatAED, fromFils } from '../lib/money';
import { pricePerSqm } from '../lib/derive';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CountUp } from '../components/ui/CountUp';
import { hasFullAccess } from '../lib/permissions';
import { ACTIVE_STATUSES, FOLLOW_UP_WINDOW_MONTHS, isPastFollowUpWindow } from '../lib/followUpPolicy';

export const DashboardView: React.FC = () => {
  const router = useRouter();
  const { currentUser, dataVersion } = useAuth();
  const [myTendersOnly, setMyTendersOnly] = useState(false);
  const [scatterLocation, setScatterLocation] = useState<string>('ALL');
  const [scatterYear, setScatterYear] = useState<string>('ALL');

  // Load all accessible tenders
  const baseTenders = useMemo(() => {
    return tenderRepository.getTenders(currentUser);
  }, [currentUser, dataVersion]);

  // Apply "My tenders only" toggle if admin/manager
  const tenders = useMemo(() => {
    if (!hasFullAccess(currentUser)) return baseTenders;
    if (myTendersOnly) {
      return baseTenders.filter(
        (t) => t.ownerId === currentUser.id || t.source?.userId === currentUser.id
      );
    }
    return baseTenders;
  }, [baseTenders, currentUser, myTendersOnly]);

  // One clock per data refresh. A fresh Date on every render made each memo
  // below recompute on every keystroke and hover.
  const now = useMemo(() => new Date(), [dataVersion]);

  // The funnel bars grow from zero once, rather than appearing at full width.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Alert Strip calculations
  const overdueFollowUps = useMemo(() => {
    return tenders.filter(
      (t) =>
        ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
        t.nextFollowUpAt &&
        new Date(t.nextFollowUpAt) < now
    );
  }, [tenders, now]);

  // Past the mandatory 2-month window with no clear status recorded.
  const pastFollowUpWindow = useMemo(
    () => tenders.filter((t) => isPastFollowUpWindow(t, now)),
    [tenders, now]
  );

  const noActivity45Days = useMemo(() => {
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 86400000);
    return tenders.filter(
      (t) =>
        ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
        new Date(t.statusUpdatedAt) < fortyFiveDaysAgo
    );
  }, [tenders, now]);

  const awardedMissingContractDate = useMemo(() => {
    return tenders.filter((t) => t.status === 'AWARDED' && (!t.award || !t.award.contractDate));
  }, [tenders]);

  // KPI Calculations
  const kpi = useMemo(() => {
    const totalCount = tenders.length;

    // Year to date against the same stretch of last year. Comparing a part
    // year with a whole one always looks like a decline.
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);
    let thisYtd = 0;
    let lastYtd = 0;
    tenders.forEach((t) => {
      const d = new Date(t.receivedAt);
      if (d >= yearStart && d <= now) thisYtd++;
      else if (d >= lastYearStart && d <= lastYearSameDay) lastYtd++;
    });

    const totalValFils = tenders.reduce((acc, t) => acc + (t.tenderAmount || 0n), 0n);

    const activeTenders = tenders.filter((t) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status)
    );
    const activeCount = activeTenders.length;
    const activeValFils = activeTenders.reduce((acc, t) => acc + (t.tenderAmount || 0n), 0n);

    const awardedTenders = tenders.filter((t) => t.status === 'AWARDED');
    const awardedCount = awardedTenders.length;
    const awardedValFils = awardedTenders.reduce(
      (acc, t) => acc + (t.award?.contractAmount || t.tenderAmount || 0n),
      0n
    );

    const rejectedTenders = tenders.filter((t) => t.status === 'REJECTED');
    const rejectedCount = rejectedTenders.length;
    const rejectedValFils = rejectedTenders.reduce((acc, t) => acc + (t.tenderAmount || 0n), 0n);

    const decided = awardedCount + rejectedCount;
    const winRate = decided > 0 ? Math.round((awardedCount / decided) * 100) : 0;

    return {
      totalCount,
      totalValFils,
      activeCount,
      activeValFils,
      awardedCount,
      awardedValFils,
      rejectedCount,
      rejectedValFils,
      winRate,
      growth: lastYtd > 0 ? Math.round(((thisYtd - lastYtd) / lastYtd) * 100) : null,
    };
  }, [tenders, now]);

  // Chart 1: Monthly Tender Volume (last 12 months). Six months of bars was
  // too short to show a trend; twelve as curves reads at a glance.
  const monthlyVolumeData = useMemo(() => {
    const monthsMap: Record<string, { month: string; received: number; awarded: number; rejected: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthsMap[key] = { month: key, received: 0, awarded: 0, rejected: 0 };
    }

    tenders.forEach((t) => {
      const d = new Date(t.receivedAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (monthsMap[key]) {
        monthsMap[key].received++;
        if (t.status === 'AWARDED') monthsMap[key].awarded++;
        else if (t.status === 'REJECTED') monthsMap[key].rejected++;
      }
    });

    return Object.values(monthsMap);
  }, [tenders, now]);

  const receivedInPeriod = monthlyVolumeData.reduce((sum, m) => sum + m.received, 0);

  // Chart 2: Pipeline Funnel (Submitted -> Under Review -> Awarded)
  const funnelData = useMemo(() => {
    const submitted = tenders.filter((t) => ['SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'REJECTED'].includes(t.status)).length;
    const underReview = tenders.filter((t) => ['UNDER_REVIEW', 'AWARDED'].includes(t.status)).length;
    const awarded = tenders.filter((t) => t.status === 'AWARDED').length;

    const conv1 = submitted > 0 ? Math.round((underReview / submitted) * 100) : 0;
    const conv2 = underReview > 0 ? Math.round((awarded / underReview) * 100) : 0;

    return [
      { stage: '1. Submitted', count: submitted, pct: '100%', fill: '#8b151b' },
      { stage: '2. Under Review', count: underReview, pct: `${conv1}% of Sub.`, fill: '#f59e0b' },
      { stage: '3. Awarded Contract', count: awarded, pct: `${conv2}% of Review`, fill: '#10b981' },
    ];
  }, [tenders]);

  // Chart 3: Source-wise performance
  const sourceData = useMemo(() => {
    const map: Record<string, { name: string; awarded: number; rejected: number; pending: number; total: number }> = {};

    tenders.forEach((t) => {
      const srcName = t.source?.name || t.sourceRaw || 'Unknown';
      if (!map[srcName]) {
        map[srcName] = { name: srcName, awarded: 0, rejected: 0, pending: 0, total: 0 };
      }
      map[srcName].total++;
      if (t.status === 'AWARDED') map[srcName].awarded++;
      else if (t.status === 'REJECTED') map[srcName].rejected++;
      else map[srcName].pending++;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tenders]);

  // Chart 4: Location-wise Distribution
  const locationData = useMemo(() => {
    const map: Record<string, { location: string; count: number; awardedValueM: number }> = {};

    tenders.forEach((t) => {
      const loc = t.location;
      if (!map[loc]) {
        map[loc] = { location: loc, count: 0, awardedValueM: 0 };
      }
      map[loc].count++;
      if (t.status === 'AWARDED') {
        const val = fromFils(t.award?.contractAmount || t.tenderAmount) || 0;
        map[loc].awardedValueM += val / 1_000_000;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        awardedValueM: Math.round(item.awardedValueM * 10) / 10,
      }));
  }, [tenders]);

  // Chart 6: Price per sqm Scatter Chart
  const scatterPoints = useMemo(() => {
    let list = tenders.filter(
      (t) =>
        (t.status === 'AWARDED' || t.status === 'REJECTED') &&
        t.totalAreaSqm &&
        t.totalAreaSqm > 0 &&
        t.tenderAmount
    );

    if (scatterLocation !== 'ALL') {
      list = list.filter((t) => t.location === scatterLocation);
    }
    if (scatterYear !== 'ALL') {
      list = list.filter((t) => t.fiscalYear === parseInt(scatterYear, 10));
    }

    const awarded: any[] = [];
    const rejected: any[] = [];

    list.forEach((t) => {
      const pps = pricePerSqm(t.tenderAmount, t.totalAreaSqm);
      if (pps && pps > 0) {
        const item = {
          x: t.totalAreaSqm,
          y: Math.round(pps),
          tenderNumber: t.tenderNumber,
          client: t.clientNameRaw,
          location: t.location,
          status: t.status,
        };
        if (t.status === 'AWARDED') awarded.push(item);
        else rejected.push(item);
      }
    });

    return { awarded, rejected };
  }, [tenders, scatterLocation, scatterYear]);

  // Unique locations and years for the scatter filters, from the data itself
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    tenders.forEach((t) => set.add(t.location));
    return Array.from(set).sort();
  }, [tenders]);

  const uniqueYears = useMemo(() => {
    const set = new Set<number>();
    tenders.forEach((t) => t.fiscalYear && set.add(t.fiscalYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [tenders]);

  const scatterCount = scatterPoints.awarded.length + scatterPoints.rejected.length;
  // Each dot animates itself in CSS (popDot); Recharts' own per-point
  // animation stutters at this many points, so it stays off.
  const rejectedDot = useMemo(() => popDot(CHART_COLORS.rejected, 0.5), []);
  const awardedDot = useMemo(() => popDot(CHART_COLORS.awarded, 0.85, 3.4), []);

  // Recent follow-ups due this week
  const followUpsDueThisWeek = useMemo(() => {
    const nextWeek = new Date(now.getTime() + 7 * 86400000);
    return tenders
      .filter(
        (t) =>
          ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
          t.nextFollowUpAt &&
          new Date(t.nextFollowUpAt) <= nextWeek
      )
      .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime())
      .slice(0, 5);
  }, [tenders, now]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Scope & My Tenders Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Abu Dhabi &amp; Dubai · {kpi.totalCount} tenders
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasFullAccess(currentUser) && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={myTendersOnly}
                onChange={(e) => setMyTendersOnly(e.target.checked)}
                className="rounded text-slate-900 focus:ring-slate-900 border-slate-300"
              />
              <span>My Tenders Only</span>
            </label>
          )}

          <button
            type="button"
            onClick={() => router.push('/tenders')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer shadow-sm"
          >
            <span>View All Tenders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alert Strip */}
      {(overdueFollowUps.length > 0 ||
        pastFollowUpWindow.length > 0 ||
        noActivity45Days.length > 0 ||
        awardedMissingContractDate.length > 0) && (
        <div className="stagger grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {pastFollowUpWindow.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/followups')}
              className="text-left bg-white border border-[var(--border)] border-l-[3px] border-l-[#8b151b] rounded-xl shadow-card hover:shadow-card-hover px-4 py-3 flex items-baseline gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg font-semibold font-mono text-[#8b151b] tabular-nums leading-none">
                <CountUp value={pastFollowUpWindow.length} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-900">Past {FOLLOW_UP_WINDOW_MONTHS}-month deadline</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Needs a clear status</span>
              </span>
            </button>
          )}
          {overdueFollowUps.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/followups')}
              className="text-left bg-white border border-[var(--border)] border-l-[3px] border-l-rose-500 rounded-xl shadow-card hover:shadow-card-hover px-4 py-3 flex items-baseline gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg font-semibold font-mono text-rose-700 tabular-nums leading-none">
                <CountUp value={overdueFollowUps.length} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-900">Overdue follow-ups</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Scheduled touchpoint has passed</span>
              </span>
            </button>
          )}
          {noActivity45Days.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/tenders')}
              className="text-left bg-white border border-[var(--border)] border-l-[3px] border-l-amber-500 rounded-xl shadow-card hover:shadow-card-hover px-4 py-3 flex items-baseline gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg font-semibold font-mono text-amber-700 tabular-nums leading-none">
                <CountUp value={noActivity45Days.length} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-900">No activity in 45 days</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Stale submitted tenders</span>
              </span>
            </button>
          )}
          {awardedMissingContractDate.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/awarded')}
              className="text-left bg-white border border-[var(--border)] border-l-[3px] border-l-slate-400 rounded-xl shadow-card hover:shadow-card-hover px-4 py-3 flex items-baseline gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg font-semibold font-mono text-slate-700 tabular-nums leading-none">
                <CountUp value={awardedMissingContractDate.length} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-900">Missing contract date</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Awarded, not yet dated</span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* Metric cards */}
      <div className="stagger grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Tenders */}
        <div className="bg-white p-4.5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Total Tenders</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-600">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 font-mono tabular-nums whitespace-nowrap">
            <CountUp value={kpi.totalCount} />
          </div>
          {kpi.growth === null ? (
            <div className="text-[11px] text-slate-400 font-medium mt-1">No prior-year data</div>
          ) : (
            <div
              className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
                kpi.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
              title="Tenders received this year to date, against the same period last year"
            >
              {kpi.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {kpi.growth >= 0 ? '+' : ''}
                {kpi.growth}% vs last year
              </span>
            </div>
          )}
        </div>

        {/* Total Tender Value */}
        <div className="bg-white p-4.5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Total Quoted Value</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--red-50)] text-[#8b151b]">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 font-mono tabular-nums whitespace-nowrap">
            {formatCompact(kpi.totalValFils)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Avg {formatCompact(kpi.totalCount > 0 ? kpi.totalValFils / BigInt(kpi.totalCount) : 0n)}/bid
          </div>
        </div>

        {/* Active Pipeline */}
        <div className="bg-white p-4.5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Active Pipeline</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 font-mono tabular-nums whitespace-nowrap">
            <CountUp value={kpi.activeCount} />
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1 font-mono">
            {formatCompact(kpi.activeValFils)} in review
          </div>
        </div>

        {/* Awarded */}
        <div className="bg-white p-4.5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Awarded Contracts</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
              <Trophy className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 flex items-baseline gap-2 font-mono tabular-nums">
            <span><CountUp value={kpi.awardedCount} /></span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CountUp value={kpi.winRate} />% win
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 font-mono">
            {formatCompact(kpi.awardedValFils)} contracted
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-4.5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Lost / Rejected</span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
              <XCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 font-mono tabular-nums whitespace-nowrap">
            <CountUp value={kpi.rejectedCount} />
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 font-mono">
            {formatCompact(kpi.rejectedValFils)} lost value
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Monthly Volume & Pipeline Funnel */}
      <div className="stagger grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Volume */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[var(--border)] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Monthly Tender Volume (Last 12 Months)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tenders received each month, and how many of them were awarded or rejected
              </p>
            </div>
            <span className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 whitespace-nowrap">
              {receivedInPeriod} received
            </span>
          </div>

          <div className="h-64">
            {receivedInPeriod === 0 ? (
              <ChartEmpty message="No tenders received in the last 12 months." />
            ) : (
              <DeferredChart order={0}>
                <ResponsiveContainer width="100%" height="100%" debounce={RESIZE_DEBOUNCE}>
                <AreaChart data={monthlyVolumeData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <AreaGradient id="grad-received" color={CHART_COLORS.brand} />
                    <AreaGradient id="grad-awarded" color={CHART_COLORS.awarded} />
                    <AreaGradient id="grad-rejected" color={CHART_COLORS.rejected} />
                  </defs>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis {...axisProps} allowDecimals={false} width={44} />
                  <Tooltip {...TOOLTIP_ORDER} cursor={lineCursor} content={<ChartTooltip />} />
                  <Legend {...legendProps} />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Received"
                    stroke={CHART_COLORS.brand}
                    strokeWidth={2}
                    fill="url(#grad-received)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    {...SMOOTH}
                  />
                  <Area
                    type="monotone"
                    dataKey="awarded"
                    name="Awarded"
                    stroke={CHART_COLORS.awarded}
                    strokeWidth={2}
                    fill="url(#grad-awarded)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    {...SMOOTH}
                  />
                  <Area
                    type="monotone"
                    dataKey="rejected"
                    name="Rejected"
                    stroke={CHART_COLORS.rejected}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    fill="url(#grad-rejected)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    {...SMOOTH}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </DeferredChart>
            )}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white p-5 rounded-xl border border-[var(--border)] flex flex-col justify-between shadow-card">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">
              Tender Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Stage progression efficiency from Submission to Contract
            </p>
          </div>

          <div className="my-4 space-y-4">
            {funnelData.map((item) => (
              <div key={item.stage} className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-700">
                  <span className="font-medium">{item.stage}</span>
                  <span className="font-mono text-slate-900 font-semibold">{item.count} deals ({item.pct})</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      // A sliver keeps a small stage visible; an empty one stays empty.
                      width: !mounted
                        ? '0%'
                        : item.count === 0
                        ? '0%'
                        : `${Math.max(3, Math.min(100, (item.count / (funnelData[0].count || 1)) * 100))}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Benchmark insight: </span>
            Conversion from Under Review to Awarded currently stands at {funnelData[2].pct}.
          </div>
        </div>
      </div>

      {/* Row 2: Price Per SQM Scatter Chart */}
      <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-900">
                Price per SQM Threshold Scatter Analysis
              </h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                Commercial Benchmark
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Awarded vs. Rejected deals plotted by Villa Area (m²) and Price/m² (AED). Bids above ~AED 3,500/m² face high rejection probability.
            </p>
          </div>

          {/* Filters for Scatter Chart */}
          <div className="flex items-center gap-2">
            <select
              value={scatterLocation}
              onChange={(e) => setScatterLocation(e.target.value)}
              className="text-xs p-1.5 rounded-xl border border-[var(--border)] bg-white font-medium text-slate-700 outline-none shadow-card"
            >
              <option value="ALL">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={scatterYear}
              onChange={(e) => setScatterYear(e.target.value)}
              className="text-xs p-1.5 rounded-xl border border-[var(--border)] bg-white font-medium text-slate-700 outline-none shadow-card"
            >
              <option value="ALL">All Years</option>
              {uniqueYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-80">
          {scatterCount === 0 ? (
            <ChartEmpty message="No decided tenders with an area recorded for this filter." />
          ) : (
          <DeferredChart order={1}>
            <ResponsiveContainer width="100%" height="100%" debounce={RESIZE_DEBOUNCE}>
            {/* Keyed on the filters so the dots sweep in again for a new selection */}
            <ScatterChart
              key={`${scatterLocation}|${scatterYear}`}
              margin={{ top: 20, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                type="number"
                dataKey="x"
                name="Area (m²)"
                {...axisProps}
                tickFormatter={(v: number) => `${compactNumber(v)} m²`}
                domain={[0, 'auto']}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="AED / m²"
                {...axisProps}
                width={52}
                tickFormatter={(v: number) => compactNumber(v)}
                domain={['auto', 'auto']}
                label={{ value: 'AED / m²', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: CHART_COLORS.axis }}
              />
              {/* Smaller, see-through dots so dense clusters still read as clusters */}
              <ZAxis range={[28, 28]} />
              <Tooltip {...TOOLTIP_ORDER}
                cursor={lineCursor}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-md shadow-lg border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-900">
                        Tender #{data.tenderNumber} - {data.client}
                      </div>
                      <div className="text-slate-500 mt-1">{data.location}</div>
                      <div className="mt-1 font-mono">
                        Area: {data.x} m²
                      </div>
                      <div className="font-mono">
                        Rate: AED {data.y.toLocaleString()} / m²
                      </div>
                      <div className="mt-1.5">
                        <StatusBadge status={data.status} size="sm" />
                      </div>
                    </div>
                  );
                }}
              />
              <Legend {...legendProps} />
              <ReferenceLine
                y={3500}
                className="threshold-line"
                stroke="#b91c1c"
                strokeDasharray="4 4"
                label={{
                  value: 'Threshold AED 3,500/m²',
                  // Drawn apart from the line, so it needs the same fade.
                  className: 'threshold-line',
                  position: 'insideTopRight',
                  fill: '#b91c1c',
                  fontSize: 11,
                  fontWeight: '500',
                }}
              />
              <Scatter
                name="Rejected Deals"
                data={scatterPoints.rejected}
                fill={CHART_COLORS.rejected}
                fillOpacity={0.5}
                shape={rejectedDot}
                isAnimationActive={false}
              />
              {/* Drawn last so the fewer awarded dots sit on top of the rejected cloud */}
              <Scatter
                name="Awarded Deals"
                data={scatterPoints.awarded}
                fill={CHART_COLORS.awarded}
                fillOpacity={0.85}
                shape={awardedDot}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
          </DeferredChart>
          )}
        </div>
      </div>

      {/* Row 3: Source-wise Performance & Location Distribution */}
      <div className="stagger grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Performance */}
        <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-card">
          <h3 className="font-semibold text-sm text-slate-900 mb-1">
            Top Source Performance (Lead Attribution)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Tenders brought in by salesperson or channel, stacked by outcome
          </p>

          <div className="h-64">
            {sourceData.length === 0 ? (
              <ChartEmpty message="No tenders in scope." />
            ) : (
              <DeferredChart order={2}>
                <ResponsiveContainer width="100%" height="100%" debounce={RESIZE_DEBOUNCE}>
                <BarChart layout="vertical" data={sourceData} barSize={14} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    {...axisProps}
                    width={96}
                    tick={<TruncatedTick maxChars={14} />}
                  />
                  <Tooltip {...TOOLTIP_ORDER} cursor={barCursor} content={<ChartTooltip showTotal />} />
                  <Legend {...legendProps} />
                  <Bar dataKey="awarded" name="Awarded" stackId="a" fill={CHART_COLORS.awarded} radius={[3, 0, 0, 3]} {...SMOOTH} />
                  <Bar dataKey="pending" name="In Pipeline" stackId="a" fill={CHART_COLORS.pipeline} {...SMOOTH} />
                  <Bar dataKey="rejected" name="Rejected" stackId="a" fill={CHART_COLORS.rejected} radius={[0, 3, 3, 0]} {...SMOOTH} />
                </BarChart>
              </ResponsiveContainer>
              </DeferredChart>
            )}
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-card">
          <h3 className="font-semibold text-sm text-slate-900 mb-1">
            Top Locations Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Volume of tenders across Abu Dhabi & Dubai master developments
          </p>

          <div className="h-64">
            {locationData.length === 0 ? (
              <ChartEmpty message="No tenders in scope." />
            ) : (
              /* Bars run sideways so names like Madinat Al Riyad fit, on phones too */
              <DeferredChart order={3}>
                <ResponsiveContainer width="100%" height="100%" debounce={RESIZE_DEBOUNCE}>
                <BarChart layout="vertical" data={locationData} barSize={14} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis
                    dataKey="location"
                    type="category"
                    {...axisProps}
                    width={110}
                    tick={<TruncatedTick maxChars={17} />}
                  />
                  <Tooltip {...TOOLTIP_ORDER}
                    cursor={barCursor}
                    content={
                      <ChartTooltip
                        footer={(d) =>
                          d.awardedValueM > 0 ? `AED ${d.awardedValueM.toLocaleString()}M awarded` : 'Nothing awarded yet'
                        }
                      />
                    }
                  />
                  <Legend {...legendProps} />
                  <Bar dataKey="count" name="Tenders" fill={CHART_COLORS.ink} radius={[0, 3, 3, 0]} {...SMOOTH} />
                </BarChart>
              </ResponsiveContainer>
              </DeferredChart>
            )}
          </div>
        </div>
      </div>

      {/* Side Panels: Follow-ups Due This Week */}
      <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">
              Follow-ups Requiring Attention This Week
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active bids with upcoming or overdue client touchpoints
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/followups')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Worklist</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {followUpsDueThisWeek.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No follow-ups due this week. All pipelines current!
            </div>
          ) : (
            followUpsDueThisWeek.map((t) => {
              const isOverdue = t.nextFollowUpAt && new Date(t.nextFollowUpAt) < now;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => router.push(`/tenders/${t.id}`)}
                  className="w-full text-left py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-md cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isOverdue ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-slate-900">
                          #{t.tenderNumber}
                        </span>
                        <span className="font-medium text-xs text-slate-800 truncate">
                          {t.clientNameRaw}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          ({t.location})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Owner: {t.owner?.name || 'Unassigned'}</span>
                        <span>•</span>
                        <span className="font-mono font-medium text-slate-700">Value: {formatAED(t.tenderAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <span
                      className={`text-[10.5px] font-medium font-mono px-2 py-0.5 rounded-md ${
                        isOverdue
                          ? 'bg-rose-50 text-rose-700 border border-rose-300'
                          : 'bg-amber-50 text-amber-700 border border-amber-300'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Due Soon'}
                    </span>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
