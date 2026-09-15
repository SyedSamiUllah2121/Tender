'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Search,
  Download,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { formatAED, fromFils } from '../lib/money';
import { pricePerSqm, formatPricePerSqm } from '../lib/derive';
import { StatusBadge } from '../components/ui/StatusBadge';

export const AwardedView: React.FC = () => {
  const router = useRouter();
  const { currentUser, dataVersion } = useAuth();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  const awardedTenders = useMemo(() => {
    const all = tenderRepository.getTenders(currentUser);
    return all.filter((t) => t.status === 'AWARDED');
  }, [currentUser, dataVersion]);

  const filtered = useMemo(() => {
    let list = awardedTenders;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.clientNameRaw.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.tenderNumber.toString().includes(q) ||
          (t.award?.projectNumber && t.award.projectNumber.toString().includes(q))
      );
    }
    if (yearFilter !== 'ALL') {
      list = list.filter((t) => t.fiscalYear === parseInt(yearFilter, 10));
    }
    return list.sort((a, b) => (b.award?.projectNumber || 0) - (a.award?.projectNumber || 0));
  }, [awardedTenders, search, yearFilter]);

  // Totals
  const totalContractVal = useMemo(() => {
    return filtered.reduce(
      (acc, t) => acc + (t.award?.contractAmount || t.tenderAmount || 0n),
      0n
    );
  }, [filtered]);

  const missingContractDateCount = useMemo(() => {
    return filtered.filter((t) => !t.award?.contractDate).length;
  }, [filtered]);

  // Export awarded projects
  const handleExport = () => {
    const rows = filtered.map((t) => ({
      'Project Number': t.award?.projectNumber ? `PJ/${t.award.projectNumber}` : '—',
      'Tender Number': t.tenderNumber,
      'Client Name': t.clientNameRaw,
      Location: t.location,
      'Contract Amount (AED)': fromFils(t.award?.contractAmount || t.tenderAmount) || '',
      'Contract Execution Date': t.award?.contractDate ? t.award.contractDate.substring(0, 10) : '',
      'Target Month': t.award?.targetMonth || '',
      'Total Area (SQM)': t.totalAreaSqm || '',
      'Rate / SQM (AED)': pricePerSqm(t.award?.contractAmount || t.tenderAmount, t.totalAreaSqm) || '',
      Consultant: t.consultant?.companyName || '',
      'Sales Owner': t.owner?.name || '',
      'Handover Notes': t.award?.handoverNotes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AwardedProjects');
    XLSX.writeFile(wb, `Inspire_Awarded_Projects_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Awarded Contracts & Project Register
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-semibold">
              {filtered.length} Projects
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Project numbers, contract values and handover notes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-white border border-slate-300 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-700" />
          <span>Export Awarded Sheet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-md border border-[var(--border)] border-t-3 border-t-emerald-600">
          <div className="text-[11px] font-medium text-emerald-700">
            Total Awarded Value
          </div>
          <div className="text-2xl font-semibold text-emerald-950 mt-1 font-mono">
            {formatAED(totalContractVal)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Across all signed contracts</div>
        </div>

        <div className="bg-white p-4 rounded-md border border-[var(--border)] border-t-3 border-t-emerald-600">
          <div className="text-[11px] font-medium text-gray-500">
            Average Project Value
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1 font-mono">
            {formatAED(filtered.length > 0 ? totalContractVal / BigInt(filtered.length) : 0n)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Per awarded villa/structure</div>
        </div>

        <div className="bg-white p-4 rounded-md border border-[var(--border)] border-t-3 border-t-amber-500">
          <div className="text-[11px] font-medium text-amber-700">
            Compliance Checklist
          </div>
          <div className="text-2xl font-semibold text-amber-950 mt-1">
            {missingContractDateCount === 0 ? (
              <span className="text-emerald-700 text-base font-bold flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" /> All Dates Recorded
              </span>
            ) : (
              <span className="text-red-700 text-base font-bold flex items-center gap-1">
                <AlertCircle className="w-5 h-5" /> {missingContractDateCount} Missing Dates
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Sign-off & municipal NOC dates</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 rounded-md border border-[var(--border)] flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter awarded projects by PJ/N, client name, or location..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border border-slate-400 outline-none"
          />
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="text-xs p-1.5 rounded-md border border-slate-400 bg-white font-medium"
        >
          <option value="ALL">All Fiscal Years</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-50 uppercase font-bold text-[11px] text-[var(--text-500)] tracking-wider">
                <th className="p-2.5">Project No</th>
                <th className="p-2.5">Tender #</th>
                <th className="p-2.5">Client Name</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5 text-right">Contract Value</th>
                <th className="p-2.5 text-right">Area (m²)</th>
                <th className="p-2.5 text-right">AED / m²</th>
                <th className="p-2.5">Contract Date</th>
                <th className="p-2.5">Target Month</th>
                <th className="p-2.5">Supervising Consultant</th>
                <th className="p-2.5">Lead Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-gray-400 text-xs">
                    No awarded projects found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const pps = pricePerSqm(t.award?.contractAmount || t.tenderAmount, t.totalAreaSqm);
                  const hasDate = Boolean(t.award?.contractDate);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/tenders/${t.id}`)}
                      className="hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          PJ/{t.award?.projectNumber || '—'}
                        </span>
                      </td>

                      <td className="p-2.5 font-mono font-bold text-gray-700 whitespace-nowrap">
                        #{t.tenderNumber}
                      </td>

                      <td className="p-2.5 font-medium text-gray-900">{t.clientNameRaw}</td>

                      <td className="p-2.5 text-gray-600 whitespace-nowrap">{t.location}</td>

                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-900 whitespace-nowrap">
                        {formatAED(t.award?.contractAmount || t.tenderAmount)}
                      </td>

                      <td className="p-2.5 text-right font-mono text-gray-700 whitespace-nowrap">
                        {t.totalAreaSqm ? `${t.totalAreaSqm.toLocaleString()} m²` : '—'}
                      </td>

                      <td className="p-2.5 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                        {pps ? `AED ${Math.round(pps).toLocaleString()}` : '—'}
                      </td>

                      <td className="p-2.5 whitespace-nowrap text-xs">
                        {hasDate ? (
                          <span className="text-gray-700 font-mono">
                            {t.award!.contractDate!.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-red-700 font-semibold flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3 h-3" /> Missing Date
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-gray-600 whitespace-nowrap text-xs">
                        {t.award?.targetMonth || '—'}
                      </td>

                      <td className="p-2.5 text-gray-600 text-xs">
                        {t.consultant?.companyName || '—'}
                      </td>

                      <td className="p-2.5 text-gray-800 font-medium text-xs whitespace-nowrap">
                        {t.owner?.name || 'Unassigned'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
