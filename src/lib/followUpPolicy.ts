import { addMonths, differenceInCalendarDays } from 'date-fns';
import { Tender, TenderStatus, FollowUp } from '../types';

/**
 * Tender Follow-Up Rule
 * ---------------------
 * Every tender must be actively followed up after submission for a maximum
 * period of TWO MONTHS. All follow-up activity is recorded in the system.
 * After two months the tender must carry a clear status:
 *   1. Awarded
 *   2. Rejected
 *   3. Still Under Process / Ongoing  (UNDER_REVIEW)
 */
export const FOLLOW_UP_WINDOW_MONTHS = 2;

/** Default gap between touchpoints when the user does not pick a date. */
export const DEFAULT_FOLLOW_UP_GAP_DAYS = 30;

/** Statuses that still sit inside the active follow-up pipeline. */
export const ACTIVE_STATUSES: TenderStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'];

/** The three outcomes that satisfy the 2-month rule. */
export const RESOLUTION_STATUSES: TenderStatus[] = ['AWARDED', 'REJECTED', 'UNDER_REVIEW'];

export const RESOLUTION_LABELS: Record<string, string> = {
  AWARDED: 'Awarded',
  REJECTED: 'Rejected',
  UNDER_REVIEW: 'Still Under Process / Ongoing',
};

export type DeadlineState =
  | 'NOT_SUBMITTED' // nothing to follow up yet
  | 'ON_TRACK' // inside the 2-month window
  | 'DUE_SOON' // 14 days or less of the window left
  | 'BREACHED' // window elapsed without a clear status
  | 'RESOLVED'; // Awarded / Rejected / Still Under Process recorded

/**
 * End of the mandatory follow-up window: submission date + 2 months.
 * Returns null when the tender has not been submitted yet.
 */
export function followUpDeadline(tender: Tender): Date | null {
  if (!tender.submittedAt) return null;
  return addMonths(new Date(tender.submittedAt), FOLLOW_UP_WINDOW_MONTHS);
}

/** True once a clear final/update status has been recorded. */
export function hasClearStatus(tender: Tender): boolean {
  return RESOLUTION_STATUSES.includes(tender.status) || tender.status === 'CANCELLED';
}

/**
 * Where this tender stands against the 2-month rule.
 * `daysToDeadline` is negative once the window has elapsed.
 */
export function deadlineState(
  tender: Tender,
  now: Date = new Date()
): { state: DeadlineState; deadlineAt: Date | null; daysToDeadline: number | null } {
  const deadlineAt = followUpDeadline(tender);
  if (!deadlineAt) {
    return { state: 'NOT_SUBMITTED', deadlineAt: null, daysToDeadline: null };
  }

  const daysToDeadline = differenceInCalendarDays(deadlineAt, now);

  if (hasClearStatus(tender)) {
    return { state: 'RESOLVED', deadlineAt, daysToDeadline };
  }
  if (daysToDeadline < 0) {
    return { state: 'BREACHED', deadlineAt, daysToDeadline };
  }
  if (daysToDeadline <= 14) {
    return { state: 'DUE_SOON', deadlineAt, daysToDeadline };
  }
  return { state: 'ON_TRACK', deadlineAt, daysToDeadline };
}

/**
 * A tender past its 2-month window that still has no clear status.
 * Admin 1 monitors and assists on these.
 */
export function isPastFollowUpWindow(tender: Tender, now: Date = new Date()): boolean {
  return deadlineState(tender, now).state === 'BREACHED';
}

/** Follow-up scheduled date is in the past and the tender is still active. */
export function isFollowUpOverdue(tender: Tender, now: Date = new Date()): boolean {
  if (!ACTIVE_STATUSES.includes(tender.status)) return false;
  if (!tender.nextFollowUpAt) return false;
  return new Date(tender.nextFollowUpAt) < now;
}

/**
 * Next follow-up never lands beyond the 2-month window: a tender must be
 * touched at least once more before the deadline forces a status decision.
 */
export function clampToWindow(tender: Tender, proposed: Date): Date {
  const deadlineAt = followUpDeadline(tender);
  if (!deadlineAt) return proposed;
  return proposed > deadlineAt ? deadlineAt : proposed;
}

/** Default next-touchpoint date, already clamped to the window. */
export function defaultNextFollowUp(tender: Tender, from: Date = new Date()): Date {
  const proposed = new Date(from);
  proposed.setDate(proposed.getDate() + DEFAULT_FOLLOW_UP_GAP_DAYS);
  return clampToWindow(tender, proposed);
}

/**
 * First scheduled touchpoint for a freshly submitted tender, already inside
 * the 2-month window.
 */
export function nextFollowUpFromSubmission(submittedAt: string): string {
  const submitted = new Date(submittedAt);
  const proposed = new Date(submitted);
  proposed.setDate(proposed.getDate() + DEFAULT_FOLLOW_UP_GAP_DAYS);
  const deadline = addMonths(submitted, FOLLOW_UP_WINDOW_MONTHS);
  return (proposed > deadline ? deadline : proposed).toISOString();
}

/**
 * One row of the management/admin monitoring board. Carries every field the
 * Manager, Admin 1 and Admin 2 must be able to see for an active tender.
 */
export interface MonitorRow {
  tender: Tender;
  tenderNumber: number;
  clientName: string;
  location: string;
  /** Assigned salesperson. */
  ownerName: string;
  ownerId: string;
  submittedAt: string | null;
  targetDate: string | null;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  followUpCount: number;
  deadlineAt: string | null;
  daysToDeadline: number | null;
  state: DeadlineState;
  status: TenderStatus;
  followUpOverdue: boolean;
  /** Days since the last recorded touchpoint, or since submission. */
  daysSinceLastFollowUp: number | null;
}

export function buildMonitorRow(tender: Tender, now: Date = new Date()): MonitorRow {
  const followUps: FollowUp[] = tender.followUps || [];
  const lastFollowUp = followUps.reduce<FollowUp | null>((latest, f) => {
    if (!latest) return f;
    return new Date(f.contactedAt) > new Date(latest.contactedAt) ? f : latest;
  }, null);

  const { state, deadlineAt, daysToDeadline } = deadlineState(tender, now);
  const lastTouch = lastFollowUp?.contactedAt || tender.submittedAt || null;

  return {
    tender,
    tenderNumber: tender.tenderNumber,
    clientName: tender.clientNameRaw,
    location: tender.location,
    ownerName: tender.owner?.name || 'Unassigned',
    ownerId: tender.ownerId,
    submittedAt: tender.submittedAt || null,
    targetDate: tender.targetDate || null,
    lastFollowUpAt: lastFollowUp ? lastFollowUp.contactedAt : null,
    nextFollowUpAt: tender.nextFollowUpAt || null,
    followUpCount: followUps.length,
    deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
    daysToDeadline,
    state,
    status: tender.status,
    followUpOverdue: isFollowUpOverdue(tender, now),
    daysSinceLastFollowUp: lastTouch ? differenceInCalendarDays(now, new Date(lastTouch)) : null,
  };
}

/** Salespeople who own at least one tender that breaches the 2-month rule. */
export function breachedByOwner(rows: MonitorRow[]): Array<{ ownerId: string; ownerName: string; count: number }> {
  const map = new Map<string, { ownerId: string; ownerName: string; count: number }>();
  rows
    .filter((r) => r.state === 'BREACHED')
    .forEach((r) => {
      const entry = map.get(r.ownerId) || { ownerId: r.ownerId, ownerName: r.ownerName, count: 0 };
      entry.count += 1;
      map.set(r.ownerId, entry);
    });
  return [...map.values()].sort((a, b) => b.count - a.count);
}
