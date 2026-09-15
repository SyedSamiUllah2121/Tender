'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  PieChart as PieIcon,
  BarChart2,
  TrendingDown,
  Award,
  Layers,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { fromFils, formatAED } from '../lib/money';

export const ReportsView: React.FC = () => {
  const { currentUser, dataVersion } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const tenders = useMemo(() => {
    let list = tenderRepository.getTenders(currentUser);
    if (selectedYear !== 'ALL') {
      list = list.filter((t) => t.fiscalYear === parseInt(selectedYear, 10));
    }
    return list;
  }, [currentUser, dataVersion, selectedYear]);

  // 1. Lost Tenders Breakdown by Reject Reason
  const rejectReasonData = useMemo(() => {
    const map: Record<string, number> = {};
    tenders.forEach((t) => {
      if (t.status === 'REJECTED') {
        const reason = t.rejectReason || 'UNSPECIFIED';
        map[reason] = (map[reason] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      PRICE_TOO_HIGH: '#b8212a',
      AWARDED_TO_COMPETITOR: '#e04848',
      CLIENT_DELAY: '#f59e0b',
      SCOPE_MISMATCH: '#3b82f6',
      NO_RESPONSE: '#6b7280',
      CLIENT_CANCELLED: '#9ca3af',
      OTHER: '#a855f7',
      UNSPECIFIED: '#cbd5e1',
    };

    return Object.entries(map).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: colors[name] || '#b8212a',
    }));
  }, [tenders]);

  // 2. Win Rate by Size Bucket (<500 sqm, 500-1000 sqm, >1000 sqm)
  const sizeBucketData = useMemo(() => {
    const buckets = [
      { name: '< 500 m²', awarded: 0, rejected: 0 },
      { name: '500 – 1,000 m²', awarded: 0, rejected: 0 },
      { name: '> 1,000 m²', awarded: 0, rejected: 0 },
    ];

    tenders.forEach((t) => {
      if (t.status === 'AWARDED' || t.status === 'REJECTED') {
        const area = t.totalAreaSqm || 0;
        let bucketIdx = 0;
        if (area > 1000) bucketIdx = 2;
        else if (area >= 500) bucketIdx = 1;

        if (t.status === 'AWARDED') buckets[bucketIdx].awarded++;
        else buckets[bucketIdx].rejected++;
      }
    });

    return buckets.map((b) => {
      const total = b.awarded + b.rejected;
      const winRate = total > 0 ? Math.round((b.awarded / total) * 100) : 0;
      return { ...b, winRate, total };
    });
  }, [tenders]);

  // 3. Consultant Performance: conversion rate & volume
  const consultantData = useMemo(() => {
    const map: Record<string, { name: string; awarded: number; rejected: number; active: number; totalValM: number }> = {};

    tenders.forEach((t) => {
      const cName = t.consultant?.companyName || 'Direct / No Consultant';
      if (!map[cName]) {
        map[cName] = { name: cName, awarded: 0, rejected: 0, active: 0, totalValM: 0 };
      }
      if (t.status === 'AWARDED') map[cName].awarded++;
      else if (t.status === 'REJECTED') map[cName].rejected++;
      else map[cName].active++;

      const aed = fromFils(t.tenderAmount) || 0;
      map[cName].totalValM += aed / 1_000_000;
    });

    return Object.values(map)
      .map((c) => {
        const decided = c.awarded + c.rejected;
        const winRate = decided > 0 ? Math.round((c.awarded / decided) * 100) : 0;
        return {
          ...c,
          winRate,
          totalValM: Math.round(c.totalValM * 10) / 10,
        };
      })
      .sort((a, b) => b.awarded - a.awarded)
      .slice(0, 8);
  }, [tenders]);

  // Export Analytics Summary
  const handleExportSummary = () => {
    const wb = XLSX.utils.book_new();

    // Rejection reasons sheet
    const wsReject = XLSX.utils.json_to_sheet(rejectReasonData);
    XLSX.utils.book_append_sheet(wb, wsReject, 'RejectionReasons');

    // Consultant conversion sheet
    const wsConsultant = XLSX.utils.json_to_sheet(consultantData);
    XLSX.utils.book_append_sheet(wb, wsConsultant, 'ConsultantPerformance');

    // Size buckets sheet
    const wsSize = XLSX.utils.json_to_sheet(sizeBucketData);
    XLSX.utils.book_append_sheet(wb, wsSize, 'SizeBuckets');

    XLSX.writeFile(wb, `Inspire_Commercial_Analytics_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Commercial Analytics & Win-Loss Intelligence
          </h1>
          <p className="text-xs text-slate-500">
            Win rates by consultant, price per square metre, and rejection reasons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs p-1.5 rounded-md border border-slate-400 bg-white font-medium"
          >
            <option value="ALL">All Fiscal Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <button
            type="button"
            onClick={handleExportSummary}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-white border border-slate-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Analytics Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: Rejection Reasons & Size Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rejection Reasons */}
        <div className="bg-white p-5 rounded-md border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Lost Tender Reasons (Post-Mortem Breakdown)
              </h3>
              <p className="text-[11px] text-gray-500">
                Primary causes for non-award based on required rejection logs
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase">
              Mandatory Feedback
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {rejectReasonData.length === 0 ? (
              <div className="text-xs text-gray-400">No rejection data recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rejectReasonData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {rejectReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Win Rate by Size Bucket */}
        <div className="bg-white p-5 rounded-md border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Win Rate by Project Size (Built-up Area)
              </h3>
              <p className="text-[11px] text-gray-500">
                Comparison of win percentage across small, medium, and large villa footprints
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeBucketData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1eaea" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="awarded" name="Awarded" fill="#146c3f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#b8212a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Consultant Conversion Efficiency */}
      <div className="bg-white p-5 rounded-md border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Consultant Efficacy & Conversion Rates
            </h3>
            <p className="text-[11px] text-gray-500">
              Ranking of engineering consultancies by total tender volume and awarded hit-rate
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-2.5">Consultant Engineering Firm</th>
                <th className="p-2.5 text-center">Awarded</th>
                <th className="p-2.5 text-center">Rejected</th>
                <th className="p-2.5 text-center">Active</th>
                <th className="p-2.5 text-center">Win Rate (%)</th>
                <th className="p-2.5 text-right">Quoted Volume (AED M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {consultantData.map((c) => (
                <tr key={c.name} className="hover:bg-gray-50">
                  <td className="p-2.5 font-bold text-gray-800">{c.name}</td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-800">
                    {c.awarded}
                  </td>
                  <td className="p-2.5 text-center font-mono text-red-700">{c.rejected}</td>
                  <td className="p-2.5 text-center font-mono text-blue-700">{c.active}</td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        c.winRate >= 30
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.winRate >= 15
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.winRate}%
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold text-gray-800">
                    AED {c.totalValM.toFixed(1)} M
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
