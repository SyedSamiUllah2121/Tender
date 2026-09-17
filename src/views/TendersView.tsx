'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RotateCcw,
  Download,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { Tender, TenderStatus } from '../types';
import { formatAED, fromFils } from '../lib/money';
import { pricePerSqm } from '../lib/derive';
import { StatusBadge } from '../components/ui/StatusBadge';
import { can, hasFullAccess } from '../lib/permissions';

export const TendersView: React.FC = () => {
  const router = useRouter();
  const { currentUser, dataVersion, allUsers, refreshData } = useAuth();

  // Filters State
  const [search, setSearch] = useState('');
  const [fiscalYear, setFiscalYear] = useState<string>('ALL');
  const [selectedStatuses, setSelectedStatuses] = useState<TenderStatus[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('ALL');
  const [valueRange, setValueRange] = useState<string>('ALL');

  // Sorting & Pagination. The pipeline opens on the newest work: most recently
  // received first, and within the same date the highest tender number, which is
  // the most recently added.
  const [sortField, setSortField] = useState<keyof Tender>('receivedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState<string>('');

  // Get data directly from repository
  const rawTenders = useMemo(() => {
    return tenderRepository.getTenders(currentUser);
  }, [currentUser, dataVersion]);

  const sources = useMemo(() => tenderRepository.getSources(), [dataVersion]);
  const consultants = useMemo(() => tenderRepository.getConsultants(), [dataVersion]);

  // Unique lists for dropdowns
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    rawTenders.forEach((t) => set.add(t.location));
    return Array.from(set).sort();
  }, [rawTenders]);

  const uniqueYears = useMemo(() => {
    const set = new Set<number>();
    rawTenders.forEach((t) => set.add(t.fiscalYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [rawTenders]);

  // Filter application
  const filteredTenders = useMemo(() => {
    let result = rawTenders;

    // Global Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.tenderNumber.toString().includes(q) ||
          t.clientNameRaw.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          (t.award?.projectNumber && t.award.projectNumber.toString().includes(q))
      );
    }

    // Fiscal Year
    if (fiscalYear !== 'ALL') {
      result = result.filter((t) => t.fiscalYear === parseInt(fiscalYear, 10));
    }

    // Status Multi
    if (selectedStatuses.length > 0) {
      result = result.filter((t) => selectedStatuses.includes(t.status));
    }

    // Sources Multi
    if (selectedSources.length > 0) {
      result = result.filter(
        (t) =>
          (t.sourceId && selectedSources.includes(t.sourceId)) ||
          selectedSources.includes(t.sourceRaw || '')
      );
    }

    // Owners Multi
    if (selectedOwners.length > 0) {
      result = result.filter((t) => t.ownerId && selectedOwners.includes(t.ownerId));
    }

    // Location
    if (selectedLocation !== 'ALL') {
      result = result.filter((t) => t.location === selectedLocation);
    }

    // Consultant
    if (selectedConsultant !== 'ALL') {
      result = result.filter((t) => t.consultantId === selectedConsultant);
    }

    // Value Range Band
    if (valueRange !== 'ALL') {
      result = result.filter((t) => {
        const val = fromFils(t.tenderAmount) || 0;
        if (valueRange === 'UNDER_1M') return val < 1_000_000;
        if (valueRange === '1M_2.5M') return val >= 1_000_000 && val < 2_500_000;
        if (valueRange === '2.5M_4M') return val >= 2_500_000 && val < 4_000_000;
        if (valueRange === 'ABOVE_4M') return val >= 4_000_000;
        return true;
      });
    }

    // Sorting
    return result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'bigint') aVal = Number(aVal);
      if (typeof bVal === 'bigint') bVal = Number(bVal);

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      // Tenders often share a received date, so fall back to the newest added
      // rather than leaving same-date rows in arbitrary order.
      return b.tenderNumber - a.tenderNumber;
    });
  }, [
    rawTenders,
    search,
    fiscalYear,
    selectedStatuses,
    selectedSources,
    selectedOwners,
    selectedLocation,
    selectedConsultant,
    valueRange,
    sortField,
    sortDirection,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTenders.length / pageSize) || 1;
  const paginatedTenders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTenders.slice(start, start + pageSize);
  }, [filteredTenders, page, pageSize]);

  // Header cell for a sortable column: shows which column drives the current
  // order and in which direction, so the default (newest received) is legible.
  const sortHeader = (
    field: keyof Tender,
    label: string,
    align: 'left' | 'right' = 'left'
  ) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`p-2.5 cursor-pointer whitespace-nowrap hover:text-slate-900 ${
          active ? 'text-slate-900' : ''
        } ${align === 'right' ? 'text-right' : ''}`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
          <span>{label}</span>
          {active ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-slate-900" />
            ) : (
              <ArrowDown className="w-3 h-3 text-slate-900" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </th>
    );
  };

  // Toggle sort direction
  const toggleSort = (field: keyof Tender) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Dates and amounts are read newest/largest first; names read A-Z.
      setSortDirection(field === 'clientNameRaw' || field === 'location' ? 'asc' : 'desc');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedTenders.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedTenders.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleBulkReassign = () => {
    if (!bulkOwnerId || selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        tenderRepository.updateTender(currentUser, id, { ownerId: bulkOwnerId });
      }
      refreshData();
      setSelectedIds([]);
      setBulkOwnerId('');
    } catch (err: any) {
      alert(err.message || 'Bulk reassign failed');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setFiscalYear('ALL');
    setSelectedStatuses([]);
    setSelectedSources([]);
    setSelectedOwners([]);
    setSelectedLocation('ALL');
    setSelectedConsultant('ALL');
    setValueRange('ALL');
    setPage(1);
  };

  // Standard Export
  const handleExportFiltered = () => {
    const rows = filteredTenders.map((t) => ({
      'Tender Number': t.tenderNumber,
      'Project Number': t.award?.projectNumber || '',
      Year: t.fiscalYear,
      Revision: t.revision,
      Client: t.clientNameRaw,
      Location: t.location,
      Region: t.region,
      Source: t.source?.name || t.sourceRaw || '',
      Owner: t.owner?.name || '',
      'Tender Amount (AED)': fromFils(t.tenderAmount) || 0,
      'Area (SQM)': t.totalAreaSqm || '',
      'Price Per SQM (AED)': pricePerSqm(t.tenderAmount, t.totalAreaSqm) || '',
      Status: t.status,
      'Submitted Date': t.submittedAt ? t.submittedAt.substring(0, 10) : '',
      'Next Follow-up': t.nextFollowUpAt ? t.nextFollowUpAt.substring(0, 10) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tenders');
    XLSX.writeFile(wb, `Inspire_Tenders_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Legacy Column Format Export
  const handleExportLegacy = () => {
    const legacyRows = filteredTenders.map((t) => ({
      'Project No': t.award?.projectNumber || '',
      'Tender No': t.tenderNumber,
      YEAR: t.fiscalYear,
      'REV NO': t.revision,
      'CLIENT NAME': t.clientNameRaw,
      LOCATION: t.location,
      'PROJECT DETAILS': t.projectDetails || '',
      SOURCE: t.source?.name || t.sourceRaw || '',
      'TOTAL AREA (SQM)': t.totalAreaSqm || '',
      'TENDER AMOUNT': fromFils(t.tenderAmount) || 0,
      'PRICE PER SQM': pricePerSqm(t.tenderAmount, t.totalAreaSqm) || '',
      STATUS: t.status,
      REMARKS: t.remarks || '',
      'RECEIVED DATE': t.receivedAt ? t.receivedAt.substring(0, 10) : '',
      'SUBMITTED DATE': t.submittedAt ? t.submittedAt.substring(0, 10) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(legacyRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TENDERS 2026');
    XLSX.writeFile(wb, `TENDERS_2026_LEGACY_FORMAT.xlsx`);
  };

  const now = new Date();

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Tenders Pipeline
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-300">
              {filteredTenders.length} entries
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Commercial bidding register, valuation, and workflow stage tracker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Segmented Control */}
          <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={handleExportFiltered}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export visible columns"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
            <div className="w-px bg-slate-200 my-0.5" />
            <button
              type="button"
              onClick={handleExportLegacy}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export in exact legacy Excel column format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Legacy Sheet</span>
            </button>
          </div>

          {/* New Tender Button */}
          {can(currentUser, 'create_tender') && (
            <button
              type="button"
              onClick={() => router.push('/tenders/new')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-red-200" />
              <span>New Tender</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Filter Bar */}
      <div className="bg-white p-4 rounded-md border border-slate-300 space-y-3">
        {/* Global Search row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by tender #, client name, location, project #..."
              className="w-full pl-8.5 pr-4 py-1.5 text-xs rounded-md border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#8b151b] focus:ring-1 focus:ring-[#8b151b] outline-none text-slate-900 placeholder:text-slate-400 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* 7-Column Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 border-t border-slate-200 text-xs">
          {/* 1. Year */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Year
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => {
                setFiscalYear(e.target.value);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Years</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Status
            </label>
            <select
              value={selectedStatuses[0] || 'ALL'}
              onChange={(e) => {
                setSelectedStatuses(e.target.value === 'ALL' ? [] : [e.target.value as TenderStatus]);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="AWARDED">Awarded</option>
              <option value="REJECTED">Rejected</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* 3. Source */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Source
            </label>
            <select
              value={selectedSources[0] || 'ALL'}
              onChange={(e) => {
                setSelectedSources(e.target.value === 'ALL' ? [] : [e.target.value]);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Owner */}
          {hasFullAccess(currentUser) && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Owner
              </label>
              <select
                value={selectedOwners[0] || 'ALL'}
                onChange={(e) => {
                  setSelectedOwners(e.target.value === 'ALL' ? [] : [e.target.value]);
                  setPage(1);
                }}
                className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
              >
                <option value="ALL">All Owners</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Location */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Consultant */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Consultant
            </label>
            <select
              value={selectedConsultant}
              onChange={(e) => {
                setSelectedConsultant(e.target.value);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Consultants</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Value Range */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Value Band
            </label>
            <select
              value={valueRange}
              onChange={(e) => {
                setValueRange(e.target.value);
                setPage(1);
              }}
              className="w-full p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none text-xs"
            >
              <option value="ALL">All Values</option>
              <option value="UNDER_1M">&lt; AED 1.0M</option>
              <option value="1M_2.5M">AED 1.0M – 2.5M</option>
              <option value="2.5M_4M">AED 2.5M – 4.0M</option>
              <option value="ABOVE_4M">&gt; AED 4.0M</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Strip for Admins */}
      {selectedIds.length > 0 && can(currentUser, 'reassign_owner') && (
        <div className="bg-slate-50 p-3 rounded-md border border-slate-300 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <span>{selectedIds.length} tender(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkOwnerId}
              onChange={(e) => setBulkOwnerId(e.target.value)}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 outline-none"
            >
              <option value="">Select New Owner...</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkReassign}
              disabled={!bulkOwnerId}
              className="px-3 py-1.5 bg-[#8b151b] hover:bg-[#731217] text-white rounded-md font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              Reassign Owner
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-md border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 uppercase font-semibold text-[10.5px] text-slate-400 tracking-wider">
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedTenders.length > 0 &&
                      paginatedTenders.every((t) => selectedIds.includes(t.id))
                    }
                    onChange={handleSelectAllOnPage}
                    className="rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                </th>
                {sortHeader('tenderNumber', 'Tender No')}
                {sortHeader('receivedAt', 'Received')}
                <th className="p-2.5 whitespace-nowrap">PJ / Award</th>
                {sortHeader('clientNameRaw', 'Client Name')}
                <th className="p-2.5">Location</th>
                <th className="p-2.5">Source</th>
                <th className="p-2.5">Owner</th>
                {sortHeader('tenderAmount', 'Tender Value', 'right')}
                <th className="p-2.5 text-right">Area (m²)</th>
                <th className="p-2.5 text-right whitespace-nowrap">AED / m²</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 whitespace-nowrap">Submitted</th>
                <th className="p-2.5 whitespace-nowrap">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {paginatedTenders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400">
                    No tenders match the selected filters or search criteria.
                  </td>
                </tr>
              ) : (
                paginatedTenders.map((tender) => {
                  const isSelected = selectedIds.includes(tender.id);
                  const pps = pricePerSqm(tender.tenderAmount, tender.totalAreaSqm);
                  const isOverdue =
                    ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(tender.status) &&
                    tender.nextFollowUpAt &&
                    new Date(tender.nextFollowUpAt) < now;

                  return (
                    <tr
                      key={tender.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50' : ''
                      }`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === 'INPUT') return;
                        router.push(`/tenders/${tender.id}`);
                      }}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, tender.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== tender.id));
                            }
                          }}
                          className="rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                        />
                      </td>

                      {/* Tender No */}
                      <td className="p-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        #{tender.tenderNumber}
                        {tender.revision !== 'Initial' && (
                          <span className="ml-1 text-[10.5px] font-sans font-normal text-slate-400">
                            ({tender.revision})
                          </span>
                        )}
                      </td>

                      {/* Received */}
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {tender.receivedAt ? tender.receivedAt.substring(0, 10) : '—'}
                      </td>

                      {/* Project No / Award */}
                      <td className="p-2.5 whitespace-nowrap">
                        {tender.award?.projectNumber ? (
                          <span className="font-mono font-medium text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300">
                            PJ/{tender.award.projectNumber}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Client Name */}
                      <td className="p-2.5 font-medium text-slate-900 max-w-xs truncate">
                        {tender.clientNameRaw}
                      </td>

                      {/* Location */}
                      <td className="p-2.5 text-slate-600 whitespace-nowrap">
                        {tender.location}
                      </td>

                      {/* Source */}
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {tender.source?.name || tender.sourceRaw || '—'}
                      </td>

                      {/* Owner */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">
                          {tender.owner?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Tender Value */}
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {formatAED(tender.tenderAmount)}
                      </td>

                      {/* Area */}
                      <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                        {tender.totalAreaSqm && tender.totalAreaSqm > 0
                          ? `${tender.totalAreaSqm.toLocaleString()} m²`
                          : '—'}
                      </td>

                      {/* Price Per SQM */}
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        {pps ? (
                          <span
                            className={
                              pps > 3500
                                ? 'text-rose-600 font-semibold'
                                : 'text-emerald-700 font-medium'
                            }
                          >
                            AED {Math.round(pps).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <StatusBadge status={tender.status} size="sm" />
                      </td>

                      {/* Submitted Date */}
                      <td className="p-2.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {tender.submittedAt ? tender.submittedAt.substring(0, 10) : '—'}
                      </td>

                      {/* Next Follow-up */}
                      <td className="p-2.5 whitespace-nowrap">
                        {tender.nextFollowUpAt ? (
                          <span
                            className={`font-mono text-[11px] ${
                              isOverdue
                                ? 'text-rose-600 font-semibold flex items-center gap-1.5'
                                : 'text-slate-600'
                            }`}
                          >
                            {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                            {tender.nextFollowUpAt.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredTenders.length)} of {filteredTenders.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="font-medium text-slate-700 font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
