export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
export type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'AWARDED' | 'REJECTED' | 'CANCELLED' | 'ON_HOLD';
export type Region = 'ABU_DHABI' | 'DUBAI' | 'OTHER';
export type SourceKind = 'PERSON' | 'EMAIL' | 'WHATSAPP' | 'CONSULTANT' | 'WALK_IN' | 'INTERNAL_SALES' | 'BROKER' | 'CLIENT_DIRECT' | 'MANAGEMENT' | 'EXHIBITION' | 'OTHER';
export type DuplicateStrategy = 'SKIP' | 'OVERWRITE' | 'REVISION';
export type FollowUpMethod = 'WhatsApp' | 'Call' | 'Email' | 'Visit';
export type RejectReason = 
  | 'PRICE_TOO_HIGH'
  | 'CLIENT_DELAY'
  | 'AWARDED_TO_COMPETITOR'
  | 'SCOPE_MISMATCH'
  | 'NO_RESPONSE'
  | 'CLIENT_CANCELLED'
  | 'OTHER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  region: Region | 'ALL';
  createdAt: string;
  deletedAt?: string | null;
}

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  userId?: string | null;
  isActive: boolean;
  aliases: string[];
  commissionRate?: string | null;
}

export interface Consultant {
  id: string;
  companyName: string;
  engineerName?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  region: Region;
  notes?: string | null;
}

export interface Client {
  id: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
}

export interface Award {
  id: string;
  tenderId: string;
  projectNumber: number; // PJ/N
  contractAmount: bigint; // in fils
  contractDate?: string | null;
  targetMonth?: string | null;
  handoverNotes?: string | null;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  tenderId: string;
  userId: string;
  userName?: string;
  contactedAt: string;
  method: 'WhatsApp' | 'Call' | 'Email' | 'Visit';
  outcome: string;
  nextActionAt?: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  tenderId: string;
  userId: string;
  userName?: string;
  userRole?: Role;
  body: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Attachment {
  id: string;
  tenderId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedById: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  tenderId?: string | null;
  userId: string;
  userName: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'FOLLOWUP_DUE' | 'STATUS_CHANGED' | 'ASSIGNED' | 'MENTIONED' | 'AWARDED';
  title: string;
  body: string;
  linkUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface Tender {
  id: string;
  tenderNumber: number;
  serialNo?: number | null;
  fiscalYear: number;
  revision: string; // Initial, Rev 1, etc.
  clientId?: string | null;
  clientNameRaw: string;
  location: string;
  region: Region;
  status: TenderStatus;
  statusUpdatedAt: string;
  tenderAmount?: bigint | null; // in fils
  targetPrice?: bigint | null; // in fils
  totalAreaSqm?: number | null;
  // pricePerSqm is derived
  projectDetails?: string | null;
  remarks?: string | null;
  commissionNote?: string | null;
  sourceId?: string | null;
  sourceRaw?: string | null;
  ownerId: string;
  consultantId?: string | null;
  receivedAt: string;
  submittedAt?: string | null;
  targetDate?: string | null;
  nextFollowUpAt?: string | null;
  rejectReason?: RejectReason | null;
  rejectNote?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Joined/populated fields for UI
  owner?: User;
  source?: Source;
  consultant?: Consultant;
  client?: Client;
  award?: Award | null;
  followUps?: FollowUp[];
  comments?: Comment[];
  activityLogs?: ActivityLog[];
  attachments?: Attachment[];
}

export interface TenderFilterParams {
  fiscalYear?: number | null;
  status?: TenderStatus[];
  sourceId?: string[];
  ownerId?: string[];
  location?: string;
  consultantId?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string;
  region?: Region;
}
