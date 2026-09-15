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
} from '../../types';
import {
  DEFAULT_PASSWORD,
  SHORTCUT_LOGIN,
  SHORTCUT_USER_ID,
  SUPERSEDED_PASSWORDS,
  SEED_USERS,
  generateSeedTenders,
  SEED_STAMP,
} from './seedData';
import { can, canAccessTender, scopeTenders, hasFullAccess } from '../permissions';
import {
  ACTIVE_STATUSES,
  buildMonitorRow,
  clampToWindow,
  defaultNextFollowUp,
  deadlineState,
  nextFollowUpFromSubmission,
  MonitorRow,
} from '../followUpPolicy';
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

// Bumped from v2 -> v3 when the fake demo tenders were replaced by the real
// history migrated from the master spreadsheet. This intentionally does NOT
// fall back to the old v2 key (only v1 is treated as legacy below), so a
// browser that already has the old fake-seeded v2 data ignores it and
// re-seeds fresh from the real dataset instead of migrating stale demo data
// forward.
// Bumped again v3 -> v4 after a dedup-matching bug fix changed the seed
// content (1,143 -> 1,156 tenders). Once a browser has ever seeded under a
// given key, initialize() just reloads that persisted blob and never re-runs
// generateSeedTenders() again - so any later fix to the seed data itself
// requires a fresh key to actually reach browsers that already seeded.
// Bumped again v4 -> v5: importedSeed.json shipped alongside the v4 change
// was accidentally still the pre-fix 1,143-tender file (a stale copy that
// never got refreshed after the dedup fix was made), so v4 browsers seeded
// with the wrong data too. v5 is the first key actually paired with the
// correct 1,156-tender dataset.
const STORAGE_KEY = 'inspire_db_v5';
const LEGACY_STORAGE_KEY = 'inspire_db_v1';

/**
 * Roles used before the Tendering Department structure was adopted.
 * Kept so existing browser data keeps working after the upgrade.
 */
const LEGACY_ROLE_MAP: Record<string, User['role']> = {
  SUPER_ADMIN: 'ADMIN_1',
  ADMIN: 'ADMIN_2',
  MANAGER: 'MANAGER',
  USER: 'SALESPERSON',
  VIEWER: 'SALESPERSON',
};

function migrateUsers(saved: User[]): User[] {
  const migrated = saved.map((u) => {
    // A password left over from an earlier build becomes the current default.
    if (u.password && SUPERSEDED_PASSWORDS.includes(u.password)) {
      u = { ...u, password: DEFAULT_PASSWORD };
    }
    // The department roster is authoritative for the people it names; anyone
    // else keeps their old role, mapped onto the new set.
    const seed = SEED_USERS.find(
      (s) => s.id === u.id || s.email.toLowerCase() === u.email.toLowerCase()
    );
    if (seed) {
      return { ...u, name: seed.name, role: seed.role, region: seed.region };
    }
    return { ...u, role: LEGACY_ROLE_MAP[u.role as string] || u.role };
  });

  // Make sure everyone in the roster exists, even on older data.
  for (const seed of SEED_USERS) {
    if (!migrated.some((u) => u.id === seed.id || u.email.toLowerCase() === seed.email.toLowerCase())) {
      migrated.push({ ...seed });
    }
  }
  return migrated;
}

/**
 * At least one active Manager or Admin 1 must remain, or nobody can administer
 * people any more. `next` is the replacement record, or null when removing.
 */
function assertPeopleAdminRemains(userId: string, next: User | null): void {
  const stillAdmin = (u: User) =>
    !u.deletedAt && u.isActive && (u.role === 'ADMIN_1' || u.role === 'MANAGER');

  const remaining = db.users.filter((u) => u.id !== userId).some(stillAdmin);
  if (remaining) return;
  if (next && stillAdmin(next)) return;

  throw new Error(
    'At least one active Manager or Admin 1 must remain to administer people and roles.'
  );
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
        const fromCurrent = localStorage.getItem(STORAGE_KEY);
        const saved = fromCurrent || localStorage.getItem(LEGACY_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;

        // A snapshot taken against a different dataset is discarded: the
        // shipped data wins, otherwise a browser that has seeded once keeps
        // its stale copy forever and never sees re-imported records.
        const staleDataset = parsed !== null && parsed.seedStamp !== SEED_STAMP;
        if (staleDataset) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }

        if (parsed && !staleDataset) {
          this.users = migrateUsers(parsed.users || []);
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
          // Upgraded from the pre-role-structure store: write it back under the
          // current key so the migration only runs once.
          if (!fromCurrent) this.persist();
          return;
        }
      } catch (err) {
        console.warn('Failed to restore from localStorage, re-seeding:', err);
      }
    }

    // Default Seed: real tender history migrated from the master spreadsheet,
    // plus the department roster. See generateSeedTenders() in seedData.ts.
    this.users = [...SEED_USERS];

    const seedResult = generateSeedTenders();
    this.sources = seedResult.sources;
    this.consultants = seedResult.consultants;
    this.clients = seedResult.clients;
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
          seedStamp: SEED_STAMP,
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
    }
  }

  resetToSeed() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
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

  /**
   * Full department roster for the admin screen: deactivated people are
   * included so they can be reactivated; deleted people are not.
   */
  getRoster(): User[] {
    return db.users.filter((u) => !u.deletedAt);
  },

  /** Tenders currently assigned to a person (used before removing them). */
  countTendersOwnedBy(userId: string): number {
    return db.tenders.filter((t) => !t.deletedAt && t.ownerId === userId).length;
  },

  getUserById(id: string): User | undefined {
    return db.users.find((u) => u.id === id);
  },

  /**
   * Validates a sign-in against the local store.
   *
   * There is no server here, so this is a UI gate rather than a security
   * boundary: the roster and its passwords live in the browser and anyone can
   * read them. This is the single place to swap for a real authentication
   * call when a backend exists.
   */
  signIn(email: string, password: string): { user?: User; error?: string } {
    const clean = email.trim().toLowerCase();
    if (!clean || !password) {
      return { error: 'Enter your email address and password.' };
    }

    const user =
      clean === SHORTCUT_LOGIN
        ? db.users.find((u) => !u.deletedAt && u.id === SHORTCUT_USER_ID)
        : db.users.find((u) => !u.deletedAt && u.email.toLowerCase() === clean);
    if (!user || (user.password ?? DEFAULT_PASSWORD) !== password) {
      // Same message either way, so the form does not confirm which addresses exist.
      return { error: 'Those details do not match an account.' };
    }
    if (!user.isActive) {
      return { error: 'This account has been deactivated. Contact Admin 1.' };
    }

    return { user };
  },

  /** Lets a signed-in person replace their own password. */
  changePassword(actor: User, currentPassword: string, nextPassword: string): void {
    const user = db.users.find((u) => u.id === actor.id && !u.deletedAt);
    if (!user) throw new Error('Account not found.');
    if ((user.password ?? DEFAULT_PASSWORD) !== currentPassword) {
      throw new Error('Your current password is not correct.');
    }
    if (nextPassword.trim().length < 8) {
      throw new Error('Choose a password of at least 8 characters.');
    }
    user.password = nextPassword;
    db.persist();
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

  createUser(actor: User, data: Omit<User, 'id' | 'createdAt'>): User {
    if (!can(actor, 'manage_users')) {
      throw new Error('Only the Manager or Admin 1 can add persons to the Tendering Department.');
    }
    const email = data.email.trim().toLowerCase();
    if (db.users.some((u) => !u.deletedAt && u.email.toLowerCase() === email)) {
      throw new Error('A user with this email already exists.');
    }
    const user: User = {
      ...data,
      email,
      name: data.name.trim(),
      password: data.password || DEFAULT_PASSWORD,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.persist();
    return user;
  },

  updateUser(actor: User, id: string, data: Partial<User>): User {
    if (!can(actor, 'manage_users')) {
      throw new Error('Only the Manager or Admin 1 can edit roles and permissions.');
    }
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');

    if (data.email) {
      const email = data.email.trim().toLowerCase();
      if (db.users.some((u) => u.id !== id && !u.deletedAt && u.email.toLowerCase() === email)) {
        throw new Error('Another person already uses this email address.');
      }
      data = { ...data, email };
    }

    if (data.name) data = { ...data, name: data.name.trim() };

    const next = { ...db.users[idx], ...data };
    assertPeopleAdminRemains(id, next);

    db.users[idx] = next;
    db.persist();
    return db.users[idx];
  },

  /**
   * Removes a person from the department. Soft delete, so tenders they own keep
   * showing their name in history and on the monitoring board.
   */
  deleteUser(actor: User, id: string): void {
    if (!can(actor, 'manage_users')) {
      throw new Error('Only the Manager or Admin 1 can remove persons.');
    }
    const user = db.users.find((u) => u.id === id && !u.deletedAt);
    if (!user) throw new Error('User not found');

    assertPeopleAdminRemains(id, null);

    user.deletedAt = new Date().toISOString();
    user.isActive = false;
    db.persist();
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
    // 1. Data layer scoping (populate first so source-based access resolves)
    const populated = db.tenders.filter((t) => !t.deletedAt).map((t) => this.populateTender(t));
    const scoped = scopeTenders(populated, currentUser);

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

    return result;
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

    const tender = this.populateTender(raw);

    // Verify role-based access
    if (!canAccessTender(currentUser, tender)) {
      return { error: 'Access denied: You do not have permission to view this tender.', status: 403 };
    }

    return { tender };
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

    // Only Manager / Admin 1 / Admin 2 may assign a tender to someone else.
    let ownerId = data.ownerId || currentUser.id;
    if (!can(currentUser, 'reassign_owner')) {
      ownerId = currentUser.id;
    }

    const nowIso = new Date().toISOString();
    const initialStatus = data.status || 'DRAFT';
    let nextFollowUpAt: string | null = null;
    let submittedAt = data.submittedAt || null;

    if (initialStatus === 'SUBMITTED') {
      submittedAt = submittedAt || nowIso;
      nextFollowUpAt = nextFollowUpFromSubmission(submittedAt);
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

    if (!can(currentUser, 'edit_tender', this.populateTender(tender))) {
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

    if (!can(currentUser, 'change_status', this.populateTender(tender))) {
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
      AWARDED: can(currentUser, 'revert_terminal_status') ? ['SUBMITTED', 'UNDER_REVIEW'] : [],
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
        throw new Error('Only the Manager, Admin 1 or Admin 2 can record an award.');
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

      // Notify the Manager & the assigned salesperson
      const manager = db.users.find((u) => u.role === 'MANAGER');
      if (manager && manager.id !== currentUser.id) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_1`,
          userId: manager.id,
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
      tender.nextFollowUpAt = nextFollowUpFromSubmission(tender.submittedAt);
      tender.rejectReason = null;
      tender.rejectNote = null;
    } else if (newStatus === 'UNDER_REVIEW') {
      // 'Still Under Process / Ongoing' is a clear status, but the tender stays
      // engaged: keep a scheduled touchpoint on it.
      if (!tender.nextFollowUpAt || new Date(tender.nextFollowUpAt) < new Date()) {
        tender.nextFollowUpAt = defaultNextFollowUp(tender).toISOString();
      }
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

    const populated = this.populateTender(tender);
    if (!can(currentUser, 'log_followup', populated)) {
      throw new Error('You do not have permission to log a follow-up on this tender.');
    }
    if (!data.outcome || !data.outcome.trim()) {
      throw new Error('A follow-up outcome must be recorded.');
    }

    const nowIso = new Date().toISOString();

    // Rule: the next touchpoint is the date chosen by the user, or +30 days,
    // and it never falls outside the mandatory 2-month follow-up window.
    const nextFollow = data.nextActionAt
      ? clampToWindow(populated, new Date(data.nextActionAt)).toISOString()
      : defaultNextFollowUp(populated).toISOString();
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
      nextActionAt: nextFollow,
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
      throw new Error('Only the Manager or Admin 1 can delete a tender.');
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
   * Management & Admin monitoring board.
   * Returns one row per tender with: assigned salesperson, submission date,
   * target date, last follow-up, next follow-up, number of follow-ups,
   * 2-month deadline, current status and overdue flags.
   */
  getMonitorRows(currentUser: User, params?: TenderFilterParams): MonitorRow[] {
    const now = new Date();
    return this.getTenders(currentUser, params)
      .map((t) => buildMonitorRow(t, now))
      .sort((a, b) => {
        // Breached first, then soonest deadline.
        const rank = (r: MonitorRow) => (r.state === 'BREACHED' ? 0 : r.state === 'DUE_SOON' ? 1 : r.state === 'ON_TRACK' ? 2 : 3);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        const ad = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
        const bd = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
        return ad - bd;
      });
  },

  /**
   * Follow-up Cron Runner.
   * 1. Scheduled touchpoint is due  -> notify the assigned salesperson.
   * 2. The 2-month window elapsed without a clear status (Awarded / Rejected /
   *    Still Under Process) -> notify the salesperson and everyone who monitors
   *    the department (Manager, Admin 1, Admin 2).
   */
  runFollowUpCron(bearerToken?: string): { count: number; dueCount: number; breachedCount: number } {
    const now = new Date();
    let dueCount = 0;
    let breachedCount = 0;

    const liveTenders = db.tenders.filter((t) => !t.deletedAt);
    const monitors = db.users.filter((u) => u.isActive && hasFullAccess(u));

    const hasUnread = (userId: string, type: Notification['type'], link: string) =>
      db.notifications.some((n) => n.userId === userId && n.type === type && n.linkUrl === link && !n.readAt);

    for (const t of liveTenders) {
      const link = `/tenders/${t.id}`;

      // 1. Scheduled follow-up is due
      const followUpDue =
        ACTIVE_STATUSES.includes(t.status) && t.nextFollowUpAt && new Date(t.nextFollowUpAt) <= now;

      if (followUpDue && !hasUnread(t.ownerId, 'FOLLOWUP_DUE', link)) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${t.id}`,
          userId: t.ownerId,
          type: 'FOLLOWUP_DUE',
          title: `Follow-up Due: Tender #${t.tenderNumber}`,
          body: `Tender for ${t.clientNameRaw} (${t.location}) is due for follow-up.`,
          linkUrl: link,
          createdAt: now.toISOString(),
        });
        dueCount++;
      }

      // 2. Past the mandatory 2-month window with no clear status
      const { state, daysToDeadline } = deadlineState(this.populateTender(t), now);
      if (state === 'BREACHED') {
        const overdueBy = Math.abs(daysToDeadline ?? 0);
        const body = `Tender #${t.tenderNumber} (${t.clientNameRaw}) passed its 2-month follow-up deadline ${overdueBy} day(s) ago. Record a clear status: Awarded, Rejected, or Still Under Process.`;

        const recipients = new Set<string>([t.ownerId, ...monitors.map((m) => m.id)]);
        for (const userId of recipients) {
          if (hasUnread(userId, 'FOLLOWUP_DUE', link)) continue;
          db.notifications.unshift({
            id: `notif_${Date.now()}_dl_${t.id}_${userId}`,
            userId,
            type: 'FOLLOWUP_DUE',
            title: `2-Month Deadline Passed: Tender #${t.tenderNumber}`,
            body,
            linkUrl: link,
            createdAt: now.toISOString(),
          });
        }
        breachedCount++;
      }
    }

    const count = dueCount + breachedCount;
    if (count > 0) db.persist();
    return { count, dueCount, breachedCount };
  },

};
