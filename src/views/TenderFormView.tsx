'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Building2, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { toFils, fromFils, formatAED } from '../lib/money';
import { pricePerSqm, formatPricePerSqm } from '../lib/derive';
import { Region, TenderStatus, ROLE_LABELS } from '../types';
import { can } from '../lib/permissions';

export const TenderFormView: React.FC = () => {
  const router = useRouter();
  const { currentUser, allUsers, refreshData } = useAuth();

  // Next suggested numbers
  const [tenderNumber, setTenderNumber] = useState<number>(() =>
    tenderRepository.getNextTenderNumber()
  );
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [revision, setRevision] = useState('Initial');

  // Client
  const [clientNameRaw, setClientNameRaw] = useState('');
  const [clientContact, setClientContact] = useState('');

  // Site
  const [location, setLocation] = useState('Madinat Al Riyad');
  const [region, setRegion] = useState<Region>('ABU_DHABI');

  // Commercial
  const [tenderAmountAED, setTenderAmountAED] = useState('');
  const [targetPriceAED, setTargetPriceAED] = useState('');
  const [totalAreaSqm, setTotalAreaSqm] = useState<string>('');

  // Only the Manager, Admin 1 and Admin 2 assign tenders to a salesperson.
  const canAssign = can(currentUser, 'reassign_owner');

  // Attribution
  const [sourceId, setSourceId] = useState('');
  const [ownerId, setOwnerId] = useState(() => currentUser.id);

  // Consultant
  const [consultantId, setConsultantId] = useState('');

  // Dates
  const [receivedAt, setReceivedAt] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().substring(0, 10);
  });
  const [submittedAt, setSubmittedAt] = useState('');

  // Notes
  const [projectDetails, setProjectDetails] = useState('Villa Block, Service Block & Boundary Wall');
  const [remarks, setRemarks] = useState('');
  const [commissionNote, setCommissionNote] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sources = tenderRepository.getSources();
  const consultants = tenderRepository.getConsultants();

  // Derived price/sqm calculation live
  const parsedTenderFils = tenderAmountAED ? toFils(tenderAmountAED) : null;
  const parsedAreaNum = totalAreaSqm ? parseFloat(totalAreaSqm) : null;
  const livePricePerSqm = pricePerSqm(parsedTenderFils, parsedAreaNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict validation
    if (!clientNameRaw.trim()) {
      setError('Client Name is strictly required.');
      return;
    }
    if (!location.trim()) {
      setError('Project Location is required.');
      return;
    }
    if (tenderNumber <= 0) {
      setError('Tender Number must be a positive integer.');
      return;
    }

    setSubmitting(true);
    try {
      const created = tenderRepository.createTender(currentUser, {
        tenderNumber,
        fiscalYear,
        revision,
        clientNameRaw,
        location,
        region,
        status: submittedAt ? 'SUBMITTED' : 'DRAFT',
        tenderAmount: parsedTenderFils,
        targetPrice: targetPriceAED ? toFils(targetPriceAED) : null,
        totalAreaSqm: parsedAreaNum,
        projectDetails,
        remarks,
        commissionNote,
        sourceId: sourceId || null,
        ownerId: canAssign ? ownerId : currentUser.id,
        consultantId: consultantId || null,
        receivedAt: new Date(receivedAt).toISOString(),
        submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      });

      refreshData();
      router.push(`/tenders/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create tender.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/tenders')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Return</span>
        </button>

        <h1 className="text-base font-semibold text-slate-900">
          Create New Commercial Tender
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Identification */}
        <div className="bg-white p-6 rounded-md border border-slate-300 space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-2">
            1. Tender Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tender Number *
              </label>
              <input
                type="number"
                required
                value={tenderNumber}
                onChange={(e) => setTenderNumber(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2 rounded-md border border-slate-400 bg-gray-50 focus:bg-white font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Fiscal Year *
              </label>
              <input
                type="number"
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Revision
              </label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* 2. Client & Site */}
        <div className="bg-white p-6 rounded-md border border-[var(--border)] space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-2">
            2. Client & Site Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Full Name *
              </label>
              <input
                type="text"
                required
                value={clientNameRaw}
                onChange={(e) => setClientNameRaw(e.target.value)}
                placeholder="e.g. Mr. Saleh Salem Ali Al Minhali"
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Contact (Optional)
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="050-XXXXXXX"
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Madinat Al Riyad, Zayed City..."
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Region *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full text-xs p-2 rounded-md border border-slate-400 bg-white font-medium"
              >
                <option value="ABU_DHABI">Abu Dhabi</option>
                <option value="DUBAI">Dubai</option>
                <option value="OTHER">Other Emirates</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Commercials (with live price/sqm) */}
        <div className="bg-white p-6 rounded-md border border-[var(--border)] space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-2">
            3. Commercial Pricing & Area
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tender Quoted Amount (AED)
              </label>
              <input
                type="text"
                value={tenderAmountAED}
                onChange={(e) => setTenderAmountAED(e.target.value)}
                placeholder="e.g. 2,450,000"
                className="w-full text-xs p-2 rounded-md border border-slate-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Target Price (AED)
              </label>
              <input
                type="text"
                value={targetPriceAED}
                onChange={(e) => setTargetPriceAED(e.target.value)}
                placeholder="e.g. 2,300,000"
                className="w-full text-xs p-2 rounded-md border border-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Total Area (SQM)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalAreaSqm}
                onChange={(e) => setTotalAreaSqm(e.target.value)}
                placeholder="e.g. 850"
                className="w-full text-xs p-2 rounded-md border border-slate-400 font-mono"
              />
              {/* Live computed price/sqm shown read-only under area field */}
              <div className="mt-1.5 p-1.5 bg-gray-50 rounded text-[11px] font-mono flex items-center justify-between border border-slate-300">
                <span className="text-gray-500">Live Rate / m²:</span>
                <span
                  className={`font-bold ${
                    livePricePerSqm && livePricePerSqm > 3500
                      ? 'text-red-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {livePricePerSqm ? `AED ${Math.round(livePricePerSqm).toLocaleString()}/m²` : '— (No area)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Attribution & Consultant */}
        <div className="bg-white p-6 rounded-md border border-[var(--border)] space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-2">
            4. Attribution & Consultant
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lead Source
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400 bg-white"
              >
                <option value="">Select Source...</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.kind})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tender Owner
              </label>
              <select
                value={canAssign ? ownerId : currentUser.id}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={!canAssign}
                className="w-full text-xs p-2 rounded-md border border-slate-400 bg-white font-medium disabled:bg-gray-100"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {ROLE_LABELS[u.role]}
                  </option>
                ))}
              </select>
              {!canAssign && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Locked to you — only the Manager or an Admin can assign tenders.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Supervising Consultant
              </label>
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400 bg-white"
              >
                <option value="">Select Consultant...</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 5. Dates & Notes */}
        <div className="bg-white p-6 rounded-md border border-[var(--border)] space-y-4">
          <h2 className="text-xs font-semibold text-slate-900 border-b border-slate-300 pb-2">
            5. Timeline Dates & Scope Notes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Received Date *
              </label>
              <input
                type="date"
                required
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Target Submission Date *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
              <div className="text-[10px] text-gray-400 mt-0.5">
                Mandatory — monitored by Admin 2.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Actual Submission Date (Sets status to Submitted)
              </label>
              <input
                type="date"
                value={submittedAt}
                onChange={(e) => setSubmittedAt(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Details / Description
              </label>
              <textarea
                rows={2}
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  General Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Received via WhatsApp, client requested urgent estimate..."
                  className="w-full text-xs p-2 rounded-md border border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Commission Note (Legacy text)
                </label>
                <input
                  type="text"
                  value={commissionNote}
                  onChange={(e) => setCommissionNote(e.target.value)}
                  placeholder="e.g. 4%+2% or 2%"
                  className="w-full text-xs p-2 rounded-md border border-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/tenders')}
            className="px-5 py-2.5 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{submitting ? 'Saving Tender...' : 'Save & Register Tender'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
