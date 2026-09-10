'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { formatCompact, formatAED, fromFils } from '../lib/money';
import { pricePerSqm } from '../lib/derive';
import { StatusBadge } from '../components/ui/StatusBadge';

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
    if (currentUser.role === 'USER') return baseTenders;
    if (myTendersOnly) {
      return baseTenders.filter(
        (t) => t.ownerId === currentUser.id || t.source?.userId === currentUser.id
      );
    }
    return baseTenders;
  }, [baseTenders, currentUser, myTendersOnly]);

  const now = new Date();

  // Alert Strip calculations
  const overdueFollowUps = useMemo(() => {
    return tenders.filter(
      (t) =>
        ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
        t.nextFollowUpAt &&
        new Date(t.nextFollowUpAt) < now
    );
  }, [tenders, now]);

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
    const currentYear = 2026;
    const lastYear = 2025;

    const totalCount = tenders.length;
    const totalCountLastYear = tenders.filter((t) => t.fiscalYear === lastYear).length;
    const totalCountThisYear = tenders.filter((t) => t.fiscalYear === currentYear).length;

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
      growth: totalCountLastYear > 0 ? Math.round(((totalCountThisYear - totalCountLastYear) / totalCountLastYear) * 100) : 12,
    };
  }, [tenders]);

  // Chart 1: Monthly Tender Volume (last 6 months)
  const monthlyVolumeData = useMemo(() => {
    const monthsMap: Record<string, { month: string; submitted: number; awarded: number; rejected: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthsMap[key] = { month: key, submitted: 0, awarded: 0, rejected: 0 };
    }

    tenders.forEach((t) => {
      const d = new Date(t.receivedAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (monthsMap[key]) {
        if (t.status === 'SUBMITTED' || t.status === 'UNDER_REVIEW') monthsMap[key].submitted++;
        else if (t.status === 'AWARDED') monthsMap[key].awarded++;
        else if (t.status === 'REJECTED') monthsMap[key].rejected++;
      }
    });

    return Object.values(monthsMap);
  }, [tenders, now]);

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

  // Unique locations for scatter filter
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    tenders.forEach((t) => set.add(t.location));
    return Array.from(set).sort();
  }, [tenders]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Commercial Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline monitoring, award conversion, and pricing intelligence across Abu Dhabi & Dubai.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.role !== 'USER' && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] transition-colors shadow-xs hover:shadow-sm cursor-pointer"
          >
            <span>View All Tenders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alert Strip */}
      {(overdueFollowUps.length > 0 ||
        noActivity45Days.length > 0 ||
        awardedMissingContractDate.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {overdueFollowUps.length > 0 && (
            <div
              onClick={() => router.push('/followups')}
              className="p-3 bg-white border border-rose-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center font-bold text-xs font-mono">
                  {overdueFollowUps.length}
                </div>
                <div>
                  <div className="font-semibold text-xs text-rose-950">Overdue Follow-ups</div>
                  <div className="text-[11px] text-rose-700">Immediate action needed</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            </div>
          )}

          {noActivity45Days.length > 0 && (
            <div
              onClick={() => router.push('/tenders')}
              className="p-3 bg-white border border-amber-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-50/40 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold text-xs font-mono">
                  {noActivity45Days.length}
                </div>
                <div>
                  <div className="font-semibold text-xs text-amber-950">No Activity in 45 Days</div>
                  <div className="text-[11px] text-amber-700">Stale submitted tenders</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {awardedMissingContractDate.length > 0 && (
            <div
              onClick={() => router.push('/awarded')}
              className="p-3 bg-white border border-purple-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-purple-50/40 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center font-bold text-xs font-mono">
                  {awardedMissingContractDate.length}
                </div>
                <div>
                  <div className="font-semibold text-xs text-purple-950">Missing Contract Date</div>
                  <div className="text-[11px] text-purple-700">Awarded compliance check</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-400" />
            </div>
          )}
        </div>
      )}

      {/* Minimalist Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Tenders */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Total Tenders
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1 font-mono">
            {kpi.totalCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{kpi.growth}% YoY volume</span>
          </div>
        </div>

        {/* Total Tender Value */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 border-t-2 border-t-[#8b151b] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8b151b]">
            Total Quoted Value
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1 font-mono">
            {formatCompact(kpi.totalValFils)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Avg {formatCompact(kpi.totalCount > 0 ? kpi.totalValFils / BigInt(kpi.totalCount) : 0n)}/bid
          </div>
        </div>

        {/* Active Pipeline */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Active Pipeline
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1 font-mono">
            {kpi.activeCount}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1 font-mono">
            {formatCompact(kpi.activeValFils)} in review
          </div>
        </div>

        {/* Awarded */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Awarded Contracts
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-baseline gap-2 font-mono">
            <span>{kpi.awardedCount}</span>
            <span className="text-[11px] font-medium px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {kpi.winRate}% win
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 font-mono">
            {formatCompact(kpi.awardedValFils)} contracted
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Lost / Rejected
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1 font-mono">
            {kpi.rejectedCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 font-mono">
            {formatCompact(kpi.rejectedValFils)} lost value
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Monthly Volume & Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Volume */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Monthly Tender Volume (Last 6 Months)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submissions, awarded projects, and rejected bids by month
              </p>
            </div>
            <span className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              Volume Count
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVolumeData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="submitted" name="Submitted" fill="#8b151b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="awarded" name="Awarded" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
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
                    className="h-full transition-all rounded-full"
                    style={{
                      width: `${Math.max(10, Math.min(100, (item.count / (funnelData[0].count || 1)) * 100))}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Benchmark insight: </span>
            Conversion from Under Review to Awarded currently stands at {funnelData[2].pct}.
          </div>
        </div>
      </div>

      {/* Row 2: Price Per SQM Scatter Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-900">
                Price per SQM Threshold Scatter Analysis
              </h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
              className="text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none"
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
              className="text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="x"
                name="Area (m²)"
                unit=" m²"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="AED / m²"
                unit=" AED"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                domain={[2000, 5000]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs">
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
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <ReferenceLine
                y={3500}
                stroke="#b91c1c"
                strokeDasharray="4 4"
                label={{
                  value: 'Competitive Threshold (AED 3,500/m²)',
                  position: 'insideTopRight',
                  fill: '#b91c1c',
                  fontSize: 11,
                  fontWeight: '500',
                }}
              />
              <Scatter name="Awarded Deals" data={scatterPoints.awarded} fill="#10b981" />
              <Scatter name="Rejected Deals" data={scatterPoints.rejected} fill="#f43f5e" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Source-wise Performance & Location Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Performance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="font-semibold text-sm text-slate-900 mb-1">
            Top Source Performance (Lead Attribution)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Tenders brought in by salesperson or channel, stacked by outcome
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={sourceData} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="awarded" name="Awarded" stackId="a" fill="#10b981" />
                <Bar dataKey="pending" name="In Pipeline" stackId="a" fill="#3b82f6" />
                <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="font-semibold text-sm text-slate-900 mb-1">
            Top Locations Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Volume of tenders across Abu Dhabi & Dubai master developments
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="location" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="count" name="Tender Volume" fill="#0f172a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Side Panels: Follow-ups Due This Week */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
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

        <div className="divide-y divide-slate-100">
          {followUpsDueThisWeek.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No follow-ups due this week. All pipelines current!
            </div>
          ) : (
            followUpsDueThisWeek.map((t) => {
              const isOverdue = t.nextFollowUpAt && new Date(t.nextFollowUpAt) < now;
              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`/tenders/${t.id}`)}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
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
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Due Soon'}
                    </span>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
