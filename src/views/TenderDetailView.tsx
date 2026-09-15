'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Building,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Paperclip,
  Copy,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { Tender } from '../types';
import { formatAED } from '../lib/money';
import { pricePerSqm, formatPricePerSqm } from '../lib/derive';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatusChangeModal } from '../components/modals/StatusChangeModal';
import { can } from '../lib/permissions';
import {
  ACTIVE_STATUSES,
  FOLLOW_UP_WINDOW_MONTHS,
  RESOLUTION_LABELS,
  deadlineState,
} from '../lib/followUpPolicy';

interface TenderDetailViewProps {
  tenderId: string;
}

export const TenderDetailView: React.FC<TenderDetailViewProps> = ({ tenderId }) => {
  const router = useRouter();
  const { currentUser, dataVersion, refreshData } = useAuth();
  const [tender, setTender] = useState<Tender | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'comments' | 'followups' | 'attachments'>('activity');

  // Modals & form state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fuMethod, setFuMethod] = useState<'WhatsApp' | 'Call' | 'Email' | 'Visit'>('Call');
  const [fuOutcome, setFuOutcome] = useState('');
  const [fuNextDate, setFuNextDate] = useState('');

  // Load tender with permission checks
  useEffect(() => {
    const res = tenderRepository.getTenderById(currentUser, tenderId);
    if (res.status === 403) {
      setAccessDenied(true);
      setTender(null);
    } else if (res.tender) {
      setAccessDenied(false);
      setTender(res.tender);
    } else {
      setTender(null);
    }
  }, [currentUser, tenderId, dataVersion]);

  // Acceptance checklist rule for 403 Scoped Confidentiality
  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-md border border-slate-300 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-300 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="inline-block px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-rose-50 text-rose-700 border border-rose-300">
          HTTP 403 FORBIDDEN
        </div>
        <h2 className="text-base font-bold text-slate-900">Access Denied: Scoped Confidentiality</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You are currently signed in as <strong>{currentUser.name}</strong> ({currentUser.email}).
          This tender belongs to another salesperson and is restricted by the data layer security policy.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/tenders')}
            className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Return to My Tenders Pipeline
          </button>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading tender details...
      </div>
    );
  }

  const now = new Date();
  const nextFollowUpDate = tender.nextFollowUpAt ? new Date(tender.nextFollowUpAt) : null;
  const daysToFollowUp = nextFollowUpDate
    ? Math.round((nextFollowUpDate.getTime() - now.getTime()) / 86400000)
    : null;
  const isOverdue = daysToFollowUp !== null && daysToFollowUp < 0;

  // Mandatory 2-month follow-up window.
  const { state: windowState, deadlineAt, daysToDeadline } = deadlineState(tender, now);
  const pastWindow = windowState === 'BREACHED';
  const deadlineISO = deadlineAt ? deadlineAt.toISOString().substring(0, 10) : null;
  const followUpCount = (tender.followUps || []).length;

  const pps = pricePerSqm(tender.tenderAmount, tender.totalAreaSqm);

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      tenderRepository.addComment(currentUser, tender.id, commentText);
      setCommentText('');
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Follow-up
  const handleLogFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuOutcome.trim()) return;
    try {
      tenderRepository.addFollowUp(currentUser, tender.id, {
        method: fuMethod,
        outcome: fuOutcome,
        nextActionAt: fuNextDate || null,
      });
      setFuOutcome('');
      setFuNextDate('');
      setShowFollowUpForm(false);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Duplicate as revision (re-bid)
  const handleDuplicateRevision = () => {
    const nextRev =
      tender.revision === 'Initial'
        ? 'Rev 1'
        : `Rev ${parseInt(tender.revision.replace(/\D/g, '') || '1', 10) + 1}`;
    try {
      const created = tenderRepository.createTender(currentUser, {
        tenderNumber: tenderRepository.getNextTenderNumber(),
        fiscalYear: tender.fiscalYear,
        revision: nextRev,
        clientId: tender.clientId,
        clientNameRaw: tender.clientNameRaw,
        location: tender.location,
        region: tender.region,
        status: 'SUBMITTED',
        tenderAmount: tender.tenderAmount,
        targetPrice: tender.targetPrice,
        totalAreaSqm: tender.totalAreaSqm,
        projectDetails: tender.projectDetails,
        remarks: `Re-bid revision created from Tender #${tender.tenderNumber}`,
        sourceId: tender.sourceId,
        sourceRaw: tender.sourceRaw,
        consultantId: tender.consultantId,
        receivedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      });
      refreshData();
      router.push(`/tenders/${created.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Merge timeline of activityLogs, followUps, comments
  const mergedTimeline: any[] = [
    ...(tender.activityLogs || []).map((a) => ({
      type: 'activity',
      id: a.id,
      date: a.createdAt,
      actor: a.userName,
      action: a.action,
      field: a.field,
      oldValue: a.oldValue,
      newValue: a.newValue,
    })),
    ...(tender.followUps || []).map((f) => ({
      type: 'followup',
      id: f.id,
      date: f.contactedAt,
      actor: f.userName,
      method: f.method,
      outcome: f.outcome,
      nextAction: f.nextActionAt,
    })),
    ...(tender.comments || []).map((c) => ({
      type: 'comment',
      id: c.id,
      date: c.createdAt,
      actor: c.userName,
      body: c.body,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-5 pb-16">
      {/* Top Breadcrumb & Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/tenders')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Pipeline</span>
        </button>

        <div className="flex items-center gap-2">
          {can(currentUser, 'edit_tender', tender) && (
            <button
              type="button"
              onClick={handleDuplicateRevision}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate as Revision</span>
            </button>
          )}

          {can(currentUser, 'change_status', tender) && (
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] cursor-pointer transition-colors"
            >
              Change Status
            </button>
          )}
        </div>
      </div>

      {/* 2-month rule breach banner */}
      {pastWindow && (
        <div className="p-4 rounded-md border border-red-300 bg-red-50 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-700" />
            <div className="text-xs">
              <div className="font-bold">
                {FOLLOW_UP_WINDOW_MONTHS}-month follow-up window closed on {deadlineISO}
              </div>
              <p className="mt-0.5 text-red-800">
                Submitted {tender.submittedAt?.substring(0, 10)} ·{' '}
                {Math.abs(daysToDeadline || 0)} day(s) past the deadline · {followUpCount} follow-up(s)
                recorded. A clear status is required: {Object.values(RESOLUTION_LABELS).join(', ')}.
              </p>
            </div>
          </div>
          {can(currentUser, 'change_status', tender) && (
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-red-700 hover:bg-red-800 shrink-0 cursor-pointer transition-colors"
            >
              Record Status
            </button>
          )}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Summary & Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Summary Card */}
          <div className="bg-white p-6 rounded-md border border-slate-300 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900">
                    Tender #{tender.tenderNumber}
                  </span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {tender.revision}
                  </span>
                  {tender.award?.projectNumber && (
                    <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300">
                      PJ/{tender.award.projectNumber}
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-bold text-slate-900 mt-1.5">
                  {tender.clientNameRaw}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {tender.location} ({tender.region})
                  </span>
                  <span>•</span>
                  <span>Fiscal Year: {tender.fiscalYear}</span>
                  {tender.receivedAt && (
                    <>
                      <span>•</span>
                      <span>Received: {tender.receivedAt.substring(0, 10)}</span>
                    </>
                  )}
                </div>
              </div>

              <StatusBadge status={tender.status} size="lg" />
            </div>

            {/* Commercial Highlights Strip */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-md border border-slate-200 text-xs">
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Quoted Amount
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                  {formatAED(tender.tenderAmount)}
                </div>
                {tender.targetPrice && (
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Target: {formatAED(tender.targetPrice)}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Total Area (SQM)
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                  {tender.totalAreaSqm && tender.totalAreaSqm > 0
                    ? `${tender.totalAreaSqm.toLocaleString()} m²`
                    : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Built-up scope</div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Rate / SQM (Derived)
                </div>
                <div
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    pps && pps > 3500 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatPricePerSqm(tender.tenderAmount, tender.totalAreaSqm)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {pps && pps > 3500 ? 'Above market avg' : 'Competitive rate'}
                </div>
              </div>
            </div>

            {/* Rejection Notice if rejected */}
            {tender.status === 'REJECTED' && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs space-y-1">
                <div className="font-semibold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Rejection Reason: {tender.rejectReason || 'Unspecified'}</span>
                </div>
                {tender.rejectNote && (
                  <p className="text-rose-800 text-[11.5px] italic">"{tender.rejectNote}"</p>
                )}
              </div>
            )}

            {/* Award Notice if awarded */}
            {tender.status === 'AWARDED' && tender.award && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs space-y-1">
                <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Awarded Contract: PJ/{tender.award.projectNumber}</span>
                </div>
                <div className="text-emerald-800 font-mono">
                  Contract Amount: {formatAED(tender.award.contractAmount)} • Signed:{' '}
                  {tender.award.contractDate ? tender.award.contractDate.substring(0, 10) : 'Pending'}
                </div>
                {tender.award.handoverNotes && (
                  <p className="text-emerald-700 text-[11px] mt-1">{tender.award.handoverNotes}</p>
                )}
              </div>
            )}

            {/* Scope of Work details */}
            <div className="space-y-1 pt-1">
              <div className="text-[11px] font-medium text-slate-400">
                Project Details / Scope
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {tender.projectDetails || 'Villa Block, Service Block & Boundary Wall.'}
              </p>
              {tender.remarks && (
                <div className="pt-2">
                  <div className="text-[11px] font-medium text-slate-400">
                    Remarks
                  </div>
                  <p className="text-xs text-slate-600 italic">{tender.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation & Content */}
          <div className="bg-white rounded-md border border-slate-300 overflow-hidden">
            <div className="flex border-b border-slate-300 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-[#8b151b] text-[#8b151b] bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Activity Timeline ({mergedTimeline.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-[#8b151b] text-[#8b151b] bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Comments ({(tender.comments || []).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('followups')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'followups'
                    ? 'border-[#8b151b] text-[#8b151b] bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Follow-ups ({(tender.followUps || []).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === 'attachments'
                    ? 'border-[#8b151b] text-[#8b151b] bg-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Attachments ({(tender.attachments || []).length})
              </button>
            </div>

            <div className="p-5">
              {/* TAB 1: Activity Timeline */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {mergedTimeline.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No activity recorded yet.
                    </div>
                  ) : (
                    <div className="relative pl-5 border-l border-slate-300 space-y-4">
                      {mergedTimeline.map((item) => (
                        <div key={item.id} className="relative">
                          <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-900" />
                          <div className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{item.actor}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(item.date).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {item.type === 'activity' && (
                              <div className="text-slate-600 mt-0.5">
                                <span className="font-semibold text-slate-700 uppercase text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 mr-1.5">
                                  {item.action}
                                </span>
                                {item.field && (
                                  <span>
                                    changed <strong className="text-slate-800">{item.field}</strong> from "{item.oldValue || 'none'}" to "{item.newValue}"
                                  </span>
                                )}
                              </div>
                            )}

                            {item.type === 'followup' && (
                              <div className="text-slate-700 mt-0.5 bg-amber-50 p-2.5 rounded-md border border-amber-300">
                                <span className="font-semibold text-amber-900">
                                  {item.method} Touchpoint:
                                </span>{' '}
                                {item.outcome}
                                {item.nextAction && (
                                  <div className="text-[11px] text-amber-700 font-mono mt-1">
                                    Next Action: {item.nextAction.substring(0, 10)}
                                  </div>
                                )}
                              </div>
                            )}

                            {item.type === 'comment' && (
                              <div className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                                {item.body}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Comments & @Mentions */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add an internal note or use @Name to mention a colleague..."
                      className="w-full text-xs p-3 rounded-md border border-slate-300 focus:border-slate-400 outline-none text-slate-900 bg-slate-50 focus:bg-white transition-colors"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-400">
                        Internal team notes are logged in real-time
                      </span>
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Post Comment</span>
                      </button>
                    </div>
                  </form>

                  <div className="divide-y divide-slate-200">
                    {(tender.comments || []).length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No comments yet. Start a discussion with your team!
                      </div>
                    ) : (
                      tender.comments!.map((c) => (
                        <div key={c.id} className="py-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{c.userName}</span>
                            <span className="text-[10.5px] font-mono text-slate-400">
                              {new Date(c.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Follow-ups */}
              {activeTab === 'followups' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">
                        Client Touchpoint Register
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Log calls, WhatsApp inquiries, in-person meetings, and client feedback
                      </p>
                    </div>
                    {!showFollowUpForm && (
                      <button
                        type="button"
                        onClick={() => setShowFollowUpForm(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                      >
                        + Log Follow-up
                      </button>
                    )}
                  </div>

                  {showFollowUpForm && (
                    <form onSubmit={handleLogFollowUp} className="p-4 bg-slate-50 border border-slate-300 rounded-md space-y-3">
                      <div className="text-xs font-semibold text-slate-900">
                        Record New Client Interaction
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Contact Channel
                          </label>
                          <select
                            value={fuMethod}
                            onChange={(e) => setFuMethod(e.target.value as any)}
                            className="w-full text-xs p-1.5 rounded-md border border-slate-300 bg-white text-slate-800 outline-none"
                          >
                            <option value="Call">Phone Call</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Visit">In-Person Site / Office Visit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Next Follow-up Date
                          </label>
                          <input
                            type="date"
                            value={fuNextDate}
                            max={deadlineISO || undefined}
                            onChange={(e) => setFuNextDate(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-md border border-slate-300 bg-white text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Outcome / Discussion Summary *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={fuOutcome}
                          onChange={(e) => setFuOutcome(e.target.value)}
                          placeholder="e.g. Spoke with client engineer. Tender is undergoing structural valuation..."
                          className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white text-slate-800 outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFollowUpForm(false)}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1 text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] rounded-md cursor-pointer transition-colors"
                        >
                          Save Touchpoint
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="divide-y divide-slate-200">
                    {(tender.followUps || []).length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No follow-up touchpoints recorded yet.
                      </div>
                    ) : (
                      tender.followUps!.map((f) => (
                        <div key={f.id} className="py-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">
                              {f.method} • {f.userName}
                            </span>
                            <span className="text-[10.5px] font-mono text-slate-400">
                              {new Date(f.contactedAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700">{f.outcome}</p>
                          {f.nextActionAt && (
                            <div className="text-[11px] text-amber-700 font-mono font-medium">
                              Scheduled Next Follow-up: {f.nextActionAt.substring(0, 10)}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Attachments */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="p-8 border border-dashed border-slate-300 rounded-md text-center space-y-2 bg-slate-50">
                    <Paperclip className="w-6 h-6 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-700">
                      Drag & drop architectural drawings, BOQ, or contract documents
                    </div>
                    <div className="text-[10.5px] text-slate-400">PDF, DWG, XLSX up to 50MB</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Rail: Status, Owner, Consultant */}
        <div className="space-y-5">
          {/* Status & Next Follow-up Card */}
          <div className="bg-white p-5 rounded-md border border-slate-300 space-y-4">
            <div>
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                Workflow Status
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={tender.status} size="lg" />
                {can(currentUser, 'change_status', tender) && (
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(true)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {/* 2-Month Follow-up Window */}
            {deadlineISO && (
              <div
                className={`p-3 rounded-md border ${
                  pastWindow
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : windowState === 'RESOLVED'
                    ? 'bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-[11px] font-medium text-slate-400 mb-1">
                  {FOLLOW_UP_WINDOW_MONTHS}-Month Follow-up Window
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="font-mono">{deadlineISO}</span>
                  <span>
                    {windowState === 'RESOLVED'
                      ? 'Status recorded'
                      : daysToDeadline !== null && daysToDeadline < 0
                      ? `${Math.abs(daysToDeadline)}d over`
                      : `${daysToDeadline}d left`}
                  </span>
                </div>
                <div className="text-[11px] mt-1 text-slate-500">
                  {followUpCount} follow-up{followUpCount === 1 ? '' : 's'} recorded
                </div>
              </div>
            )}

            {/* Next Follow-up Countdown */}
            {tender.nextFollowUpAt && ACTIVE_STATUSES.includes(tender.status) && (
              <div
                className={`p-3 rounded-md border ${
                  isOverdue
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`} />
                  <span className="font-semibold text-xs">
                    {isOverdue
                      ? `Overdue by ${Math.abs(daysToFollowUp || 0)} days!`
                      : `Due in ${daysToFollowUp || 0} days`}
                  </span>
                </div>
                <div className="text-[11px] mt-1 font-mono text-slate-600">
                  Target date: {tender.nextFollowUpAt.substring(0, 10)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('followups');
                    setShowFollowUpForm(true);
                  }}
                  className="mt-2 text-xs font-semibold text-slate-900 hover:underline block cursor-pointer"
                >
                  Log follow-up now →
                </button>
              </div>
            )}
          </div>

          {/* Owner Attribution Card */}
          <div className="bg-white p-5 rounded-md border border-slate-300 space-y-3">
            <div className="text-[11px] font-medium text-slate-400">
              Assigned Tender Owner
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center border border-slate-300">
                {tender.owner?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-900">
                  {tender.owner?.name || 'Unassigned'}
                </div>
                <div className="text-[11px] text-slate-400">{tender.owner?.email}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Lead Source:</span>
                <span className="font-medium text-slate-900">
                  {tender.source?.name || tender.sourceRaw || 'Direct'}
                </span>
              </div>
              {tender.consultant && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultant:</span>
                  <span className="font-medium text-slate-900">
                    {tender.consultant.companyName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <StatusChangeModal
          tender={tender}
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onSuccess={(updated) => setTender(updated)}
        />
      )}
    </div>
  );
};
