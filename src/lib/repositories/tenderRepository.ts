import {
  User,
  Source,
  Consultant,
  Client,
  Tender,
  Award,
  FollowUp,
  Comment,
  ActivityLog,
  Notification,
  TenderStatus,
  RejectReason,
  TenderFilterParams,
  Region,
  DuplicateStrategy,
} from '../../types';
import {
  SEED_USERS,
  SEED_SOURCES,
  SEED_CONSULTANTS,
  SEED_CLIENTS,
  generateSeedTenders,
} from './seedData';
import { can, canAccessTender, scopeTenders } from '../permissions';
import { normalizeStatus, normalizeSourceName, normalizeLocation, parseExcelDate } from '../normalize';
import { toFils } from '../money';

export interface StatusChangePayload {
  rejectReason?: RejectReason | null;
  rejectNote?: string | null;
  cancelReason?: string | null;
  holdReason?: string | null;
  revertReason?: string | null;
  // For Awarded
  projectNumber?: number | null;
  contractAmount?: bigint | null;
  contractDate?: string | null;
  targetMonth?: string | null;
  handoverNotes?: string | null;
}

class InMemoryDatabase {
  users: User[] = [];
  sources: Source[] = [];
  consultants: Consultant[] = [];
  clients: Client[] = [];
  tenders: Tender[] = [];
  awards: Award[] = [];
  followUps: FollowUp[] = [];
  comments: Comment[] = [];
  activityLogs: ActivityLog[] = [];
  notifications: Notification[] = [];
  initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized) return;

    // Try loading from localStorage if in browser
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('inspire_db_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.users = parsed.users || [];
          this.sources = parsed.sources || [];
          this.consultants = parsed.consultants || [];
          this.clients = parsed.clients || [];
          // Convert string BigInts back to BigInt
          this.tenders = (parsed.tenders || []).map((t: any) => ({
            ...t,
            tenderAmount: t.tenderAmount ? BigInt(t.tenderAmount) : null,
            targetPrice: t.targetPrice ? BigInt(t.targetPrice) : null,
          }));
          this.awards = (parsed.awards || []).map((a: any) => ({
            ...a,
            contractAmount: BigInt(a.contractAmount || 0),
          }));
          this.followUps = parsed.followUps || [];
          this.comments = parsed.comments || [];
          this.activityLogs = parsed.activityLogs || [];
          this.notifications = parsed.notifications || [];
          this.initialized = true;
          return;
        }
      } catch (err) {
        console.warn('Failed to restore from localStorage, re-seeding:', err);
      }
    }

    // Default Seed
    this.users = [...SEED_USERS];
    this.sources = [...SEED_SOURCES];
    this.consultants = [...SEED_CONSULTANTS];
    this.clients = [...SEED_CLIENTS];

    const seedResult = generateSeedTenders();
    this.tenders = seedResult.tenders;
    this.awards = seedResult.awards;
    this.followUps = seedResult.followUps;
    this.activityLogs = seedResult.activityLogs;
    this.notifications = seedResult.notifications;

    this.initialized = true;
    this.persist();
  }

  persist() {
    if (typeof window !== 'undefined') {
      try {
        const serializable = {
          users: this.users,
          sources: this.sources,
          consultants: this.consultants,
          clients: this.clients,
          tenders: this.tenders.map((t) => ({
            ...t,
            tenderAmount: t.tenderAmount ? t.tenderAmount.toString() : null,
            targetPrice: t.targetPrice ? t.targetPrice.toString() : null,
          })),
          awards: this.awards.map((a) => ({
            ...a,
            contractAmount: a.contractAmount.toString(),
          })),
          followUps: this.followUps,
          comments: this.comments,
          activityLogs: this.activityLogs,
          notifications: this.notifications,
        };
        localStorage.setItem('inspire_db_v1', JSON.stringify(serializable));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
    }
  }

  resetToSeed() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('inspire_db_v1');
    }
    this.initialized = false;
    this.initialize();
  }
}

export const db = new InMemoryDatabase();

/**
 * Repository layer for Tenders, Awards, Follow-ups, Activities
 */
export const tenderRepository = {
  getUsers(): User[] {
    return db.users.filter((u) => !u.deletedAt && u.isActive);
  },

  getUserById(id: string): User | undefined {
    return db.users.find((u) => u.id === id);
  },

  getUserByEmail(email: string): User | undefined {
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getSources(): Source[] {
    return db.sources.filter((s) => s.isActive);
  },

  getConsultants(): Consultant[] {
    return [...db.consultants];
  },

  getClients(): Client[] {
    return [...db.clients];
  },

  resetToSeed(): void {
    db.resetToSeed();
  },

  createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      ...data,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.persist();
    return user;
  },

  updateUser(id: string, data: Partial<User>): User {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    db.users[idx] = { ...db.users[idx], ...data };
    db.persist();
    return db.users[idx];
  },

  createSource(data: Omit<Source, 'id' | 'aliases'> & { aliases?: string[] }): Source {
    const source: Source = {
      ...data,
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      aliases: data.aliases || [data.name],
    };
    db.sources.push(source);
    db.persist();
    return source;
  },

  createConsultant(data: Omit<Consultant, 'id' | 'region'> & { region?: Region }): Consultant {
    const consultant: Consultant = {
      ...data,
      id: `cns_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      region: data.region || 'ABU_DHABI',
    };
    db.consultants.push(consultant);
    db.persist();
    return consultant;
  },

  // Populate references
  populateTender(tender: Tender): Tender {
    const owner = db.users.find((u) => u.id === tender.ownerId);
    const source = db.sources.find((s) => s.id === tender.sourceId);
    const consultant = db.consultants.find((c) => c.id === tender.consultantId);
    const client = db.clients.find((cl) => cl.id === tender.clientId);
    const award = db.awards.find((a) => a.tenderId === tender.id) || null;
    const followUps = db.followUps
      .filter((f) => f.tenderId === tender.id)
      .sort((a, b) => new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime());
    const comments = db.comments
      .filter((c) => c.tenderId === tender.id && !c.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const activityLogs = db.activityLogs
      .filter((l) => l.tenderId === tender.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      ...tender,
      owner,
      source,
      consultant,
      client,
      award,
      followUps,
      comments,
      activityLogs,
    };
  },

  /**
   * Get list of tenders, strictly scoped by user role at data layer.
   */
  getTenders(currentUser: User, params?: TenderFilterParams): Tender[] {
    // 1. Data layer scoping
    const scoped = scopeTenders(db.tenders, currentUser);

    // 2. Filter criteria
    let result = scoped;

    if (params) {
      if (params.fiscalYear) {
        result = result.filter((t) => t.fiscalYear === params.fiscalYear);
      }
      if (params.status && params.status.length > 0) {
        result = result.filter((t) => params.status!.includes(t.status));
      }
      if (params.sourceId && params.sourceId.length > 0) {
        result = result.filter((t) => t.sourceId && params.sourceId!.includes(t.sourceId));
      }
      if (params.ownerId && params.ownerId.length > 0) {
        result = result.filter((t) => params.ownerId!.includes(t.ownerId));
      }
      if (params.location) {
        const locLower = params.location.toLowerCase();
        result = result.filter((t) => t.location.toLowerCase().includes(locLower));
      }
      if (params.consultantId) {
        result = result.filter((t) => t.consultantId === params.consultantId);
      }
      if (params.region) {
        result = result.filter((t) => t.region === params.region);
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        result = result.filter(
          (t) =>
            t.tenderNumber.toString().includes(q) ||
            t.clientNameRaw.toLowerCase().includes(q) ||
            t.location.toLowerCase().includes(q) ||
            (t.projectDetails && t.projectDetails.toLowerCase().includes(q))
        );
      }
      if (params.minAmount !== undefined && params.minAmount !== null) {
        const minFils = BigInt(Math.round(params.minAmount * 100));
        result = result.filter((t) => t.tenderAmount && t.tenderAmount >= minFils);
      }
      if (params.maxAmount !== undefined && params.maxAmount !== null) {
        const maxFils = BigInt(Math.round(params.maxAmount * 100));
        result = result.filter((t) => t.tenderAmount && t.tenderAmount <= maxFils);
      }
    }

    // Default sort: tenderNumber descending
    result.sort((a, b) => b.tenderNumber - a.tenderNumber);

    return result.map((t) => this.populateTender(t));
  },

  /**
   * Get single tender by ID.
   * Returns: { tender: Tender } or throws error if 403 / not found.
   */
  getTenderById(currentUser: User, id: string): { tender?: Tender; error?: string; status?: number } {
    const raw = db.tenders.find((t) => t.id === id);
    if (!raw || raw.deletedAt) {
      return { error: 'Tender not found', status: 404 };
    }

    // Verify role-based access
    if (!canAccessTender(currentUser, raw)) {
      return { error: 'Access denied: You do not have permission to view this tender.', status: 403 };
    }

    return { tender: this.populateTender(raw) };
  },

  getNextTenderNumber(): number {
    const max = db.tenders.reduce((acc, t) => Math.max(acc, t.tenderNumber || 0), 1200);
    return max + 1;
  },

  getNextProjectNumber(): number {
    const max = db.awards.reduce((acc, a) => Math.max(acc, a.projectNumber || 0), 209);
    return max + 1;
  },

  createTender(
    currentUser: User,
    data: {
      tenderNumber?: number;
      serialNo?: number;
      fiscalYear?: number;
      revision?: string;
      clientId?: string | null;
      clientNameRaw: string;
      location: string;
      region?: Region;
      status?: TenderStatus;
      tenderAmount?: bigint | null;
      targetPrice?: bigint | null;
      totalAreaSqm?: number | null;
      projectDetails?: string | null;
      remarks?: string | null;
      commissionNote?: string | null;
      sourceId?: string | null;
      sourceRaw?: string | null;
      ownerId?: string;
      consultantId?: string | null;
      receivedAt?: string;
      submittedAt?: string | null;
      targetDate?: string | null;
    }
  ): Tender {
    if (!can(currentUser, 'create_tender')) {
      throw new Error('You do not have permission to create a tender.');
    }

    const tenderNumber = data.tenderNumber || this.getNextTenderNumber();

    // Check uniqueness
    if (db.tenders.some((t) => !t.deletedAt && t.tenderNumber === tenderNumber)) {
      throw new Error(`Tender number #${tenderNumber} already exists.`);
    }

    // Role check: Regular user cannot assign owner to someone else
    let ownerId = data.ownerId || currentUser.id;
    if (currentUser.role === 'USER') {
      ownerId = currentUser.id;
    }

    const nowIso = new Date().toISOString();
    const initialStatus = data.status || 'DRAFT';
    let nextFollowUpAt: string | null = null;
    let submittedAt = data.submittedAt || null;

    if (initialStatus === 'SUBMITTED') {
      submittedAt = submittedAt || nowIso;
      const d = new Date(submittedAt);
      d.setDate(d.getDate() + 30);
      nextFollowUpAt = d.toISOString();
    }

    const newTender: Tender = {
      id: `tnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenderNumber,
      serialNo: data.serialNo || null,
      fiscalYear: data.fiscalYear || new Date().getFullYear(),
      revision: data.revision || 'Initial',
      clientId: data.clientId || null,
      clientNameRaw: data.clientNameRaw.trim(),
      location: normalizeLocation(data.location),
      region: data.region || 'ABU_DHABI',
      status: initialStatus,
      statusUpdatedAt: nowIso,
      tenderAmount: data.tenderAmount || null,
      targetPrice: data.targetPrice || null,
      totalAreaSqm: data.totalAreaSqm || null,
      projectDetails: data.projectDetails || null,
      remarks: data.remarks || null,
      commissionNote: data.commissionNote || null,
      sourceId: data.sourceId || null,
      sourceRaw: data.sourceRaw || null,
      ownerId,
      consultantId: data.consultantId || null,
      receivedAt: data.receivedAt || nowIso,
      submittedAt,
      targetDate: data.targetDate || null,
      nextFollowUpAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.tenders.unshift(newTender);

    // Activity Log
    db.activityLogs.unshift({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      tenderId: newTender.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CREATED',
      field: 'status',
      oldValue: null,
      newValue: initialStatus,
      createdAt: nowIso,
    });

    db.persist();
    return this.populateTender(newTender);
  },

  updateTender(currentUser: User, id: string, patch: Partial<Tender>): Tender {
    const tender = db.tenders.find((t) => t.id === id && !t.deletedAt);
    if (!tender) throw new Error('Tender not found');

    if (!can(currentUser, 'edit_tender', tender)) {
      throw new Error('You do not have permission to edit this tender.');
    }

    // Track changes for ActivityLog
    const nowIso = new Date().toISOString();
    const fieldsToTrack: (keyof Tender)[] = [
      'clientNameRaw',
      'location',
      'region',
      'tenderAmount',
      'targetPrice',
      'totalAreaSqm',
      'projectDetails',
      'remarks',
      'commissionNote',
      'sourceId',
      'consultantId',
      'targetDate',
    ];

    for (const field of fieldsToTrack) {
      if (patch[field] !== undefined && patch[field] !== tender[field]) {
        db.activityLogs.unshift({
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          tenderId: tender.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'FIELD_UPDATED',
          field,
          oldValue: String(tender[field] ?? ''),
          newValue: String(patch[field] ?? ''),
          createdAt: nowIso,
        });
      }
    }

    // Owner change check
    if (patch.ownerId && patch.ownerId !== tender.ownerId) {
      if (!can(currentUser, 'reassign_owner')) {
        throw new Error('Only Admins can reassign tender ownership.');
      }
      db.activityLogs.unshift({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        tenderId: tender.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'REASSIGNED',
        field: 'ownerId',
        oldValue: tender.ownerId,
        newValue: patch.ownerId,
        createdAt: nowIso,
      });

      // Notify new owner
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: patch.ownerId,
        type: 'ASSIGNED',
        title: `Tender #${tender.tenderNumber} assigned to you`,
        body: `${currentUser.name} assigned tender #${tender.tenderNumber} (${tender.clientNameRaw}) to you.`,
        linkUrl: `/tenders/${tender.id}`,
        createdAt: nowIso,
      });
    }

    Object.assign(tender, patch, { updatedAt: nowIso });
    db.persist();
    return this.populateTender(tender);
  },

  /**
   * Status Transition Machine with strict side-effects & transactional semantics
   */
  changeStatus(currentUser: User, id: string, newStatus: TenderStatus, payload: StatusChangePayload = {}): Tender {
    const tender = db.tenders.find((t) => t.id === id && !t.deletedAt);
    if (!tender) throw new Error('Tender not found');

    if (!can(currentUser, 'change_status', tender)) {
      throw new Error('You do not have permission to change the status of this tender.');
    }

    const currentStatus = tender.status;
    if (currentStatus === newStatus) return this.populateTender(tender);

    // Validate Transition rules
    const allowedTransitions: Record<TenderStatus, TenderStatus[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['UNDER_REVIEW', 'AWARDED', 'REJECTED', 'ON_HOLD', 'CANCELLED'],
      UNDER_REVIEW: ['AWARDED', 'REJECTED', 'ON_HOLD', 'CANCELLED'],
      ON_HOLD: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
      AWARDED: currentUser.role === 'SUPER_ADMIN' ? ['SUBMITTED', 'UNDER_REVIEW'] : [],
      REJECTED: ['SUBMITTED'], // Re-bid increments revision
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}.`);
    }

    const nowIso = new Date().toISOString();

    // Side-effects & Validation per Status
    if (newStatus === 'REJECTED') {
      // REJECTED: rejectReason is REQUIRED.
      if (!payload.rejectReason) {
        throw new Error('Reject reason is required when rejecting a tender.');
      }
      if (payload.rejectReason === 'OTHER' && !payload.rejectNote?.trim()) {
        throw new Error('Reject note is required when reason is OTHER.');
      }
      tender.rejectReason = payload.rejectReason;
      tender.rejectNote = payload.rejectNote || null;
      tender.nextFollowUpAt = null;
    } else if (newStatus === 'AWARDED') {
      // AWARDED: require projectNumber, contractAmount, contractDate
      if (!can(currentUser, 'record_award')) {
        throw new Error('Only Super Admin / Admin can record an award.');
      }
      if (!payload.projectNumber) {
        throw new Error('Project Number (PJ/N) is required when awarding a tender.');
      }
      if (!payload.contractAmount || payload.contractAmount <= 0n) {
        throw new Error('Valid Contract Amount is required when awarding a tender.');
      }

      // Check unique projectNumber
      const existingAward = db.awards.find((a) => a.projectNumber === payload.projectNumber && a.tenderId !== tender.id);
      if (existingAward) {
        throw new Error(`Project Number PJ/${payload.projectNumber} is already assigned to another tender.`);
      }

      // Remove existing award if any
      db.awards = db.awards.filter((a) => a.tenderId !== tender.id);
      const newAward: Award = {
        id: `awd_${Date.now()}`,
        tenderId: tender.id,
        projectNumber: payload.projectNumber,
        contractAmount: payload.contractAmount,
        contractDate: payload.contractDate || nowIso,
        targetMonth: payload.targetMonth || null,
        handoverNotes: payload.handoverNotes || null,
        createdAt: nowIso,
      };
      db.awards.push(newAward);

      tender.nextFollowUpAt = null;

      // Notify Super Admin & Owner
      const superAdmin = db.users.find((u) => u.role === 'SUPER_ADMIN');
      if (superAdmin && superAdmin.id !== currentUser.id) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_1`,
          userId: superAdmin.id,
          type: 'AWARDED',
          title: `Project Awarded: PJ/${newAward.projectNumber}`,
          body: `Tender #${tender.tenderNumber} (${tender.clientNameRaw}) has been marked AWARDED by ${currentUser.name}.`,
          linkUrl: `/tenders/${tender.id}`,
          createdAt: nowIso,
        });
      }
      if (tender.ownerId !== currentUser.id) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_2`,
          userId: tender.ownerId,
          type: 'AWARDED',
          title: `Congratulations! Tender #${tender.tenderNumber} Awarded`,
          body: `Your tender for ${tender.clientNameRaw} has been officially AWARDED (PJ/${newAward.projectNumber}).`,
          linkUrl: `/tenders/${tender.id}`,
          createdAt: nowIso,
        });
      }
    } else if (newStatus === 'SUBMITTED') {
      if (!tender.submittedAt) {
        tender.submittedAt = nowIso;
      }
      // Re-bid check: if previous status was REJECTED, increment revision
      if (currentStatus === 'REJECTED') {
        const revMatch = tender.revision.match(/Rev\s*(\d+)/i);
        if (revMatch) {
          tender.revision = `Rev ${parseInt(revMatch[1], 10) + 1}`;
        } else {
          tender.revision = 'Rev 1';
        }
      }
      const d = new Date(tender.submittedAt);
      d.setDate(d.getDate() + 30);
      tender.nextFollowUpAt = d.toISOString();
      tender.rejectReason = null;
      tender.rejectNote = null;
    } else if (newStatus === 'CANCELLED' || newStatus === 'ON_HOLD') {
      tender.nextFollowUpAt = null;
      if (newStatus === 'CANCELLED' && payload.cancelReason) {
        tender.remarks = (tender.remarks ? `${tender.remarks} | Cancel Reason: ` : 'Cancel Reason: ') + payload.cancelReason;
      }
      if (newStatus === 'ON_HOLD' && payload.holdReason) {
        tender.remarks = (tender.remarks ? `${tender.remarks} | Hold Reason: ` : 'Hold Reason: ') + payload.holdReason;
      }
    }

    tender.status = newStatus;
    tender.statusUpdatedAt = nowIso;
    tender.updatedAt = nowIso;

    // Log status change
    db.activityLogs.unshift({
      id: `act_${Date.now()}`,
      tenderId: tender.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'STATUS_CHANGED',
      field: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
      createdAt: nowIso,
    });

    // Notify owner if actor is someone else
    if (tender.ownerId !== currentUser.id) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_sc`,
        userId: tender.ownerId,
        type: 'STATUS_CHANGED',
        title: `Tender #${tender.tenderNumber} status updated`,
        body: `${currentUser.name} changed status from ${currentStatus} to ${newStatus}.`,
        linkUrl: `/tenders/${tender.id}`,
        createdAt: nowIso,
      });
    }

    db.persist();
    return this.populateTender(tender);
  },

  addFollowUp(
    currentUser: User,
    tenderId: string,
    data: {
      method: 'WhatsApp' | 'Call' | 'Email' | 'Visit';
      outcome: string;
      nextActionAt?: string | null;
    }
  ): FollowUp {
    const tender = db.tenders.find((t) => t.id === tenderId && !t.deletedAt);
    if (!tender) throw new Error('Tender not found');

    if (!can(currentUser, 'edit_tender', tender)) {
      throw new Error('You do not have permission to log a follow-up on this tender.');
    }

    const nowIso = new Date().toISOString();

    // Rule: Logging a follow-up sets nextFollowUpAt to user's nextActionAt or now + 30 days
    let nextFollow: string;
    if (data.nextActionAt) {
      nextFollow = new Date(data.nextActionAt).toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      nextFollow = d.toISOString();
    }
    tender.nextFollowUpAt = nextFollow;
    tender.updatedAt = nowIso;

    const followUp: FollowUp = {
      id: `fu_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      tenderId,
      userId: currentUser.id,
      userName: currentUser.name,
      contactedAt: nowIso,
      method: data.method,
      outcome: data.outcome.trim(),
      nextActionAt: data.nextActionAt || null,
      createdAt: nowIso,
    };

    db.followUps.unshift(followUp);

    // Activity Log
    db.activityLogs.unshift({
      id: `act_${Date.now()}`,
      tenderId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'FOLLOW_UP_LOGGED',
      field: 'followUp',
      oldValue: null,
      newValue: `${data.method}: ${data.outcome}`,
      createdAt: nowIso,
    });

    db.persist();
    return followUp;
  },

  addComment(currentUser: User, tenderId: string, body: string): Comment {
    const tender = db.tenders.find((t) => t.id === tenderId && !t.deletedAt);
    if (!tender) throw new Error('Tender not found');

    const nowIso = new Date().toISOString();
    const comment: Comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      tenderId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      body: body.trim(),
      createdAt: nowIso,
    };

    db.comments.unshift(comment);

    // Detect @mentions: e.g. @Bilal, @Hassan, @Shahzaib
    const mentions = body.match(/@(\w+)/g);
    if (mentions) {
      for (const m of mentions) {
        const namePart = m.replace('@', '').toLowerCase();
        const targetUser = db.users.find((u) => u.name.toLowerCase().includes(namePart));
        if (targetUser && targetUser.id !== currentUser.id) {
          db.notifications.unshift({
            id: `notif_${Date.now()}_${targetUser.id}`,
            userId: targetUser.id,
            type: 'MENTIONED',
            title: `Mentioned by ${currentUser.name}`,
            body: `Mentioned you in Tender #${tender.tenderNumber}: "${body.substring(0, 80)}"`,
            linkUrl: `/tenders/${tender.id}`,
            createdAt: nowIso,
          });
        }
      }
    }

    db.persist();
    return comment;
  },

  softDeleteTender(currentUser: User, id: string): void {
    const tender = db.tenders.find((t) => t.id === id && !t.deletedAt);
    if (!tender) throw new Error('Tender not found');

    if (!can(currentUser, 'soft_delete')) {
      throw new Error('Only Super Admin / Admin can delete a tender.');
    }

    const nowIso = new Date().toISOString();
    tender.deletedAt = nowIso;
    tender.updatedAt = nowIso;

    db.activityLogs.unshift({
      id: `act_${Date.now()}`,
      tenderId: tender.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'SOFT_DELETED',
      field: 'deletedAt',
      oldValue: null,
      newValue: nowIso,
      createdAt: nowIso,
    });

    db.persist();
  },

  getNotifications(currentUser: User): Notification[] {
    return db.notifications
      .filter((n) => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  markNotificationRead(currentUser: User, notifId: string): void {
    const notif = db.notifications.find((n) => n.id === notifId && n.userId === currentUser.id);
    if (notif) {
      notif.readAt = new Date().toISOString();
      db.persist();
    }
  },

  markAllNotificationsRead(currentUser: User): void {
    const nowIso = new Date().toISOString();
    db.notifications
      .filter((n) => n.userId === currentUser.id && !n.readAt)
      .forEach((n) => {
        n.readAt = nowIso;
      });
    db.persist();
  },

  /**
   * Follow-up Cron Runner: Checks overdue follow-ups and creates FOLLOWUP_DUE notifications
   */
  runFollowUpCron(bearerToken?: string): { count: number } {
    const now = new Date();
    let count = 0;

    const activeTenders = db.tenders.filter(
      (t) =>
        !t.deletedAt &&
        ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(t.status) &&
        t.nextFollowUpAt &&
        new Date(t.nextFollowUpAt) <= now
    );

    for (const t of activeTenders) {
      // Check if unread notification already exists for this tender
      const existing = db.notifications.find(
        (n) => n.userId === t.ownerId && n.type === 'FOLLOWUP_DUE' && n.linkUrl === `/tenders/${t.id}` && !n.readAt
      );

      if (!existing) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${t.id}`,
          userId: t.ownerId,
          type: 'FOLLOWUP_DUE',
          title: `Follow-up Due: Tender #${t.tenderNumber}`,
          body: `Tender for ${t.clientNameRaw} (${t.location}) is due for follow-up.`,
          linkUrl: `/tenders/${t.id}`,
          createdAt: now.toISOString(),
        });
        count++;
      }
    }

    if (count > 0) db.persist();
    return { count };
  },

  /**
   * Excel Batch Import Executor (Phase 6)
   */
  commitImportBatch(
    currentUser: User,
    rows: Array<{
      tenderNumber?: number;
      serialNo?: number;
      fiscalYear: number;
      clientNameRaw: string;
      location: string;
      region?: Region;
      statusRaw?: string;
      tenderAmount?: number | null;
      targetPrice?: number | null;
      totalAreaSqm?: number | null;
      projectDetails?: string | null;
      remarks?: string | null;
      commissionNote?: string | null;
      sourceRaw?: string | null;
      consultantCompanyRaw?: string | null;
      consultantEngineerRaw?: string | null;
      consultantContactRaw?: string | null;
      receivedAt?: Date | null;
      submittedAt?: Date | null;
      targetDate?: Date | null;
      // Awarded fields if imported from Awarded sheet
      isAwardedSheet?: boolean;
      projectNumber?: number | null;
      contractAmount?: number | null;
      contractDate?: Date | null;
    }>,
    strategy: DuplicateStrategy = 'SKIP'
  ): {
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } {
    if (!can(currentUser, 'import_excel')) {
      throw new Error('Only Super Admin / Admin can import Excel data.');
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        if (!row.clientNameRaw || !row.clientNameRaw.trim()) {
          skippedCount++;
          continue;
        }

        // 1. Resolve source
        let sourceId: string | null = null;
        if (row.sourceRaw) {
          const normSource = normalizeSourceName(row.sourceRaw);
          let foundSrc = db.sources.find((s) => s.name.toLowerCase() === normSource.canonicalName.toLowerCase());
          if (!foundSrc) {
            foundSrc = {
              id: `src_imp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              name: normSource.canonicalName,
              kind: normSource.kind,
              isActive: true,
              aliases: [row.sourceRaw],
            };
            db.sources.push(foundSrc);
          }
          sourceId = foundSrc.id;
        }

        // 2. Resolve consultant
        let consultantId: string | null = null;
        if (row.consultantCompanyRaw) {
          const cleanCo = row.consultantCompanyRaw.trim();
          let foundCons = db.consultants.find((c) => c.companyName.toLowerCase() === cleanCo.toLowerCase());
          if (!foundCons) {
            foundCons = {
              id: `cons_imp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              companyName: cleanCo,
              engineerName: row.consultantEngineerRaw || null,
              contactNumber: row.consultantContactRaw || null,
              region: row.region || 'ABU_DHABI',
            };
            db.consultants.push(foundCons);
          }
          consultantId = foundCons.id;
        }

        // 3. Resolve status
        const normStatus = normalizeStatus(row.statusRaw);
        const finalStatus = row.isAwardedSheet ? 'AWARDED' : normStatus.status;
        const finalRegion: Region = row.region || normStatus.region || 'ABU_DHABI';

        // 4. Deduplication rule:
        // Match by tenderNumber if given; else by (fiscalYear, serialNo); else fuzzy (client, location, amount)
        let existing: Tender | undefined;
        if (row.tenderNumber) {
          existing = db.tenders.find((t) => !t.deletedAt && t.tenderNumber === row.tenderNumber);
        }
        if (!existing && row.serialNo && row.fiscalYear) {
          existing = db.tenders.find(
            (t) => !t.deletedAt && t.fiscalYear === row.fiscalYear && t.serialNo === row.serialNo
          );
        }
        if (!existing && row.clientNameRaw && row.location) {
          existing = db.tenders.find(
            (t) =>
              !t.deletedAt &&
              t.clientNameRaw.toLowerCase() === row.clientNameRaw.toLowerCase() &&
              t.location.toLowerCase() === normalizeLocation(row.location).toLowerCase() &&
              t.fiscalYear === row.fiscalYear
          );
        }

        // Handle amounts of 0 as null (Test requirement: "Amounts of 0 mean 'not quoted', not 'free' — import as null")
        const amountFils = row.tenderAmount && row.tenderAmount > 0 ? toFils(row.tenderAmount) : null;
        const targetFils = row.targetPrice && row.targetPrice > 0 ? toFils(row.targetPrice) : null;

        if (existing) {
          if (strategy === 'SKIP') {
            skippedCount++;
            continue;
          }

          if (strategy === 'REVISION') {
            const revCount = db.tenders.filter((t) => t.tenderNumber === existing!.tenderNumber).length;
            const revTender: Tender = {
              ...existing,
              id: `tnd_imp_rev_${Date.now()}_${existing.tenderNumber}_${revCount}`,
              revision: `Rev ${revCount}`,
              status: finalStatus,
              tenderAmount: amountFils || existing.tenderAmount,
              targetPrice: targetFils || existing.targetPrice,
              totalAreaSqm: row.totalAreaSqm && row.totalAreaSqm > 0 ? row.totalAreaSqm : existing.totalAreaSqm,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            db.tenders.push(revTender);
            createdCount++;
            continue;
          }

          // Update existing tender (OVERWRITE)
          existing.status = finalStatus;
          if (amountFils) existing.tenderAmount = amountFils;
          if (row.totalAreaSqm && row.totalAreaSqm > 0) existing.totalAreaSqm = row.totalAreaSqm;
          if (consultantId) existing.consultantId = consultantId;
          if (sourceId) existing.sourceId = sourceId;

          // If from Awarded sheet, attach/update Award record
          if (row.isAwardedSheet || finalStatus === 'AWARDED') {
            const pNo = row.projectNumber || this.getNextProjectNumber();
            const cAmt = row.contractAmount ? toFils(row.contractAmount)! : amountFils || toFils(2000000)!;
            const existingAward = db.awards.find((a) => a.tenderId === existing!.id);
            if (existingAward) {
              existingAward.projectNumber = pNo;
              existingAward.contractAmount = cAmt;
              if (row.contractDate) existingAward.contractDate = row.contractDate.toISOString();
            } else {
              db.awards.push({
                id: `awd_imp_${Date.now()}_${pNo}`,
                tenderId: existing.id,
                projectNumber: pNo,
                contractAmount: cAmt,
                contractDate: row.contractDate ? row.contractDate.toISOString() : new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });
            }
          }

          updatedCount++;
        } else {
          // Create new tender
          const tNo = row.tenderNumber || this.getNextTenderNumber();
          const newTender: Tender = {
            id: `tnd_imp_${Date.now()}_${tNo}`,
            tenderNumber: tNo,
            serialNo: row.serialNo || null,
            fiscalYear: row.fiscalYear,
            revision: 'Initial',
            clientNameRaw: row.clientNameRaw.trim(),
            location: normalizeLocation(row.location),
            region: finalRegion,
            status: finalStatus,
            statusUpdatedAt: (row.submittedAt || new Date()).toISOString(),
            tenderAmount: amountFils,
            targetPrice: targetFils,
            totalAreaSqm: row.totalAreaSqm && row.totalAreaSqm > 0 ? row.totalAreaSqm : null,
            projectDetails: row.projectDetails || null,
            remarks: row.remarks || null,
            commissionNote: row.commissionNote || null,
            sourceId,
            sourceRaw: row.sourceRaw || null,
            ownerId: currentUser.id,
            consultantId,
            receivedAt: (row.receivedAt || new Date()).toISOString(),
            submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
            targetDate: row.targetDate ? row.targetDate.toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          db.tenders.push(newTender);

          if (row.isAwardedSheet || finalStatus === 'AWARDED') {
            const pNo = row.projectNumber || this.getNextProjectNumber();
            const cAmt = row.contractAmount ? toFils(row.contractAmount)! : amountFils || toFils(2000000)!;
            db.awards.push({
              id: `awd_imp_${Date.now()}_${pNo}`,
              tenderId: newTender.id,
              projectNumber: pNo,
              contractAmount: cAmt,
              contractDate: row.contractDate ? row.contractDate.toISOString() : new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }

          createdCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Row ${idx + 1} (${row.clientNameRaw || 'Unknown'}): ${err.message}`);
      }
    }

    db.persist();
    return {
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
    };
  },
};
