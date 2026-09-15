'use client';

import React, { useState } from 'react';
import { X, AlertCircle, ShieldAlert } from 'lucide-react';
import { Tender, TenderStatus, RejectReason } from '../../types';
import { toFils } from '../../lib/money';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';

interface StatusChangeModalProps {
  tender: Tender;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Tender) => void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  tender,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, refreshData } = useAuth();
  const [targetStatus, setTargetStatus] = useState<TenderStatus>('SUBMITTED');
  const [rejectReason, setRejectReason] = useState<RejectReason>('PRICE_TOO_HIGH');
  const [rejectNote, setRejectNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [revertReason, setRevertReason] = useState('');

  // Awarded fields
  const [projectNumber, setProjectNumber] = useState<number>(() =>
    tender.award?.projectNumber || tenderRepository.getNextProjectNumber()
  );
  const [contractAmountAED, setContractAmountAED] = useState<string>(() =>
    tender.tenderAmount ? (Number(tender.tenderAmount) / 100).toString() : ''
  );
  const [contractDate, setContractDate] = useState<string>(
    () => tender.award?.contractDate?.substring(0, 10) || new Date().toISOString().substring(0, 10)
  );
  const [targetMonth, setTargetMonth] = useState<string>(() => tender.award?.targetMonth || '');
  const [handoverNotes, setHandoverNotes] = useState<string>(() => tender.award?.handoverNotes || '');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Determine allowed transitions
  const allowedMap: Record<TenderStatus, TenderStatus[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['UNDER_REVIEW', 'AWARDED', 'REJECTED', 'ON_HOLD', 'CANCELLED'],
    UNDER_REVIEW: ['AWARDED', 'REJECTED', 'ON_HOLD', 'CANCELLED'],
    ON_HOLD: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
    AWARDED: can(currentUser, 'revert_terminal_status') ? ['SUBMITTED', 'UNDER_REVIEW'] : [],
    REJECTED: ['SUBMITTED'],
    CANCELLED: [],
  };

  const allowed = allowedMap[tender.status] || [];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate terminal revert by Super Admin
      if (
        (tender.status === 'AWARDED' || tender.status === 'REJECTED') &&
        !can(currentUser, 'revert_terminal_status')
      ) {
        throw new Error('Only the Manager or Admin 1 can revert an Awarded or Rejected tender.');
      }

      if (tender.status === 'AWARDED' && !revertReason.trim()) {
        throw new Error('Please provide an audit reason for reverting this awarded contract.');
      }

      // Validate Awarded fields
      if (targetStatus === 'AWARDED') {
        if (!projectNumber || projectNumber <= 0) {
          throw new Error('A valid sequential Project Number is required for award.');
        }
        if (!contractAmountAED || parseFloat(contractAmountAED) <= 0) {
          throw new Error('Valid Contract Amount (AED) is required for award.');
        }
        if (!contractDate) {
          throw new Error('Contract Date is required for award.');
        }
      }

      const payload: any = {
        rejectReason: targetStatus === 'REJECTED' ? rejectReason : null,
        rejectNote: targetStatus === 'REJECTED' ? rejectNote : null,
        cancelReason: targetStatus === 'CANCELLED' ? cancelReason : null,
        holdReason: targetStatus === 'ON_HOLD' ? holdReason : null,
        revertReason: revertReason || null,
        projectNumber: targetStatus === 'AWARDED' ? Number(projectNumber) : null,
        contractAmount: targetStatus === 'AWARDED' ? toFils(contractAmountAED) : null,
        contractDate: targetStatus === 'AWARDED' ? contractDate : null,
        targetMonth: targetStatus === 'AWARDED' ? targetMonth : null,
        handoverNotes: targetStatus === 'AWARDED' ? handoverNotes : null,
      };

      const updated = tenderRepository.changeStatus(currentUser, tender.id, targetStatus, payload);
      refreshData();
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in-50 duration-100">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400">
              Workflow Transition
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              Change Status: Tender #{tender.tenderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs Target */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Select Target Status
            </label>
            {allowed.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Current status <strong>{tender.status}</strong> is terminal. Only Super Admin can revert.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allowed.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setTargetStatus(st);
                      setError(null);
                    }}
                    className={`py-2 px-3 rounded-md text-xs font-medium border transition-colors text-left cursor-pointer ${
                      targetStatus === st
                        ? 'border-[#8b151b] bg-[#8b151b] text-white '
                        : 'border-slate-300 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    {st === 'AWARDED' ? 'Awarded Contract' : st === 'REJECTED' ? 'Rejected Bid' : st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* REJECTED fields */}
          {targetStatus === 'REJECTED' && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-md space-y-3">
              <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Mandatory Rejection Analytics</span>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Primary Reject Reason *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value as RejectReason)}
                  required
                  className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
                >
                  <option value="PRICE_TOO_HIGH">Price Too High (Lost on Commercials)</option>
                  <option value="TECHNICAL_NON_COMPLIANCE">Technical Non-Compliance</option>
                  <option value="CLIENT_POSTPONED">Client Cancelled or Postponed Project</option>
                  <option value="COMPETITOR_RELATIONSHIP">Competitor Relationship / Incumbent</option>
                  <option value="NO_RESPONSE">No Client Feedback / Ghosted</option>
                  <option value="SCOPE_CHANGED">Project Scope Substantially Changed</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Competitor Winner / Debrief Notes
                </label>
                <textarea
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. Awarded to Al Naboodah at AED 2.8M (~AED 3,100/m²)..."
                  className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
                />
              </div>
            </div>
          )}

          {/* AWARDED fields */}
          {targetStatus === 'AWARDED' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-md space-y-3">
              <div className="text-xs font-semibold text-emerald-900">
                Awarded Project Transition (Mandatory)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Project Number (PJ No) *
                  </label>
                  <input
                    type="number"
                    required
                    value={projectNumber}
                    onChange={(e) => setProjectNumber(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Final Contract Amount (AED) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={contractAmountAED}
                    onChange={(e) => setContractAmountAED(e.target.value)}
                    placeholder="e.g. 3500000"
                    className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Contract Signing Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Target Start Month
                  </label>
                  <input
                    type="text"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    placeholder="e.g. May 2026"
                    className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Operational Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Key deliverables, advance payment guarantees, site mobilization date..."
                  className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
                />
              </div>
            </div>
          )}

          {/* Revert Reason if moving out of AWARDED */}
          {tender.status === 'AWARDED' && targetStatus !== 'AWARDED' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-md space-y-2">
              <label className="block text-xs font-semibold text-amber-900">
                Super Admin Revert Justification *
              </label>
              <textarea
                required
                rows={2}
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Reason for reverting an officially awarded contract..."
                className="w-full text-xs p-2 rounded-md border border-amber-300 bg-white text-slate-900 outline-none"
              />
            </div>
          )}

          {targetStatus === 'CANCELLED' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                required
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this tender was cancelled..."
                className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
              />
            </div>
          )}

          {targetStatus === 'ON_HOLD' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for On-Hold State *
              </label>
              <textarea
                required
                rows={2}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g. Municipality re-zoning pending, client requested delay..."
                className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-900 outline-none"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || allowed.length === 0}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer disabled:opacity-40"
            >
              {submitting ? 'Applying...' : 'Confirm Status Transition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
