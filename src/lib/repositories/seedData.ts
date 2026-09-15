import {
  User,
  Source,
  Consultant,
  Client,
  Tender,
  Award,
  FollowUp,
  ActivityLog,
  Notification,
  TenderStatus,
} from '../../types';
import { toFils } from '../money';

/** Starting password for every seeded account; changed per person in the app. */
export const DEFAULT_PASSWORD = '123';

/** Passwords from earlier builds, reset to the current default on load. */
export const SUPERSEDED_PASSWORDS = ['inspire@2026'];

/**
 * Types straight into the sign-in form as a shortcut for the Manager account.
 * Convenience for development only - remove it before this is used for real.
 */
export const SHORTCUT_LOGIN = '123';
export const SHORTCUT_USER_ID = 'u_hassan';
import { CANONICAL_SOURCES } from '../normalize';

export const SEED_USERS: User[] = [
  // 1. Manager - full / all access to the Tendering Department
  {
    id: 'u_hassan',
    email: 'hassan@inspire.ae',
    name: 'Engr. Hassan',
    role: 'MANAGER',
    phone: '+971501112233',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ALL',
    createdAt: '2024-01-01T08:00:00Z',
  },
  // 2. Admin 1 - full access + people, roles and permissions
  {
    id: 'u_shahzaib',
    email: 'shahzaib@inspire.ae',
    name: 'Syed Shahzaib',
    role: 'ADMIN_1',
    phone: '+971503334455',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ALL',
    createdAt: '2024-01-01T08:00:00Z',
  },
  // 3. Admin 2 - tender administration and follow-up records
  {
    id: 'u_haseeb',
    email: 'haseeb@inspire.ae',
    name: 'Haseeb',
    role: 'ADMIN_2',
    phone: '+971508889900',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ALL',
    createdAt: '2024-01-01T08:00:00Z',
  },
  // 4. Sources - own assigned tenders and follow-ups only
  {
    id: 'u_bilal',
    email: 'bilal@inspire.ae',
    name: 'Engr. Bilal',
    role: 'SALESPERSON',
    phone: '+971502223344',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ABU_DHABI',
    createdAt: '2024-01-05T08:00:00Z',
  },
  {
    id: 'u_yaqoob',
    email: 'yaqoob@inspire.ae',
    name: 'Sir Yaqub',
    role: 'SALESPERSON',
    phone: '+971505556677',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ABU_DHABI',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'u_waseem',
    email: 'waseem@inspire.ae',
    name: 'Engr. Waseem',
    role: 'SALESPERSON',
    phone: '+971504445566',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ABU_DHABI',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'u_hamad',
    email: 'hamad@inspire.ae',
    name: 'Engr. Hamad',
    role: 'SALESPERSON',
    phone: '+971507778899',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'ABU_DHABI',
    createdAt: '2024-01-15T08:00:00Z',
  },
  // 5. Dubai Villas only
  {
    id: 'u_zeeshan',
    email: 'zeeshan@inspire.ae',
    name: 'Engr. Zeeshan',
    role: 'DUBAI_VILLAS',
    phone: '+971506667788',
    isActive: true,
    password: DEFAULT_PASSWORD,
    region: 'DUBAI',
    createdAt: '2024-01-20T08:00:00Z',
  },
];

export const SEED_SOURCES: Source[] = CANONICAL_SOURCES.map((def, idx) => {
  const matchingUser = SEED_USERS.find((u) => def.emailPrefix && u.email.startsWith(def.emailPrefix.replace('@', '')));
  return {
    id: `src_${idx + 1}`,
    name: def.canonical,
    kind: def.kind,
    userId: matchingUser ? matchingUser.id : null,
    isActive: true,
    aliases: def.aliases,
  };
});

export const SEED_CONSULTANTS: Consultant[] = [
  {
    id: 'cons_1',
    companyName: 'Al Ajmi Engineering',
    engineerName: 'Eng Mohamad Alsharaa',
    contactNumber: '050-8330059',
    email: 'alsharaa@alajmi.ae',
    region: 'ABU_DHABI',
    notes: 'Major consultant in Madinat Al Riyad & Zayed City',
  },
  {
    id: 'cons_2',
    companyName: 'SBC',
    engineerName: 'Engr Abdullah',
    contactNumber: '055-8551121',
    email: 'abdullah@sbc-eng.ae',
    region: 'ABU_DHABI',
    notes: 'High volume luxury villa projects',
  },
  {
    id: 'cons_3',
    companyName: 'Arcal Engineering',
    engineerName: 'Eng Ahmed Adas',
    contactNumber: '050-1107434',
    email: 'adas@arcal.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_4',
    companyName: 'Glory Consultant',
    engineerName: 'Eng Osama Hassan',
    contactNumber: '052-7889900',
    email: 'glory@consultant.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_5',
    companyName: 'Smart Buildings Engineering',
    engineerName: 'Engineer Ali',
    contactNumber: '056-3047605',
    email: 'ali@smartbuild.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_6',
    companyName: 'Target Engineering',
    engineerName: 'Engr Tariq',
    contactNumber: '050-4499112',
    email: 'tariq@targeteng.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_7',
    companyName: 'Al Firas',
    engineerName: 'Engr Ali Nabi',
    contactNumber: '056-6166910',
    email: 'ali.nabi@alfiras.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_8',
    companyName: 'QWAEID',
    engineerName: 'Eng Mufeed Hussain',
    contactNumber: '055-3922874',
    email: 'mufeed@qwaeid.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_9',
    companyName: 'Smart Engineering',
    engineerName: 'Engr Sameer',
    contactNumber: '052-3192953',
    email: 'sameer@smarteng.ae',
    region: 'DUBAI',
  },
  {
    id: 'cons_10',
    companyName: 'Creative Team',
    engineerName: 'Eng Adeel Jahangir',
    contactNumber: '056-9008220',
    email: 'adeel@creativeteam.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_11',
    companyName: 'Al Reyada',
    engineerName: 'Eng Muhammad Khalil',
    contactNumber: '050-6677881',
    email: 'khalil@alreyada.ae',
    region: 'ABU_DHABI',
  },
  {
    id: 'cons_12',
    companyName: 'NCO',
    engineerName: 'Engr Ibrahim',
    contactNumber: '055-1234567',
    email: 'ibrahim@nco.ae',
    region: 'ABU_DHABI',
  },
];

export const SEED_CLIENTS: Client[] = [
  { id: 'cli_1', name: 'Mr. Saleh Salem Ali Al Minhali', contactNumber: '050-1234567' },
  { id: 'cli_2', name: 'Mr. Mubarak Saeed Al Mansoori', contactNumber: '050-2345678' },
  { id: 'cli_3', name: 'Mr. Ahmed Hamad Al Zaabi', contactNumber: '050-3456789' },
  { id: 'cli_4', name: 'Mr. Sultan Obaid Al Dhaheri', contactNumber: '050-4567890' },
  { id: 'cli_5', name: 'Mr. Mohammed Khalfan Al Mazrouei', contactNumber: '050-5678901' },
  { id: 'cli_6', name: 'Mr. Saeed Butti Al Qubaisi', contactNumber: '050-6789012' },
  { id: 'cli_7', name: 'Mr. Rashid Nasser Al Nuaimi', contactNumber: '050-7890123' },
  { id: 'cli_8', name: 'Mr. Khalid Abdullah Al Marzooqi', contactNumber: '050-8901234' },
  { id: 'cli_9', name: 'Mr. Mansoor Ali Al Shehhi', contactNumber: '050-9012345' },
  { id: 'cli_10', name: 'Mr. Hamad Salem Al Shamsi', contactNumber: '050-1122334' },
  { id: 'cli_11', name: 'Mr. Butti Suhail Al Maktoum', contactNumber: '050-2233445' },
  { id: 'cli_12', name: 'Mr. Omar Khalifa Al Ketbi', contactNumber: '050-3344556' },
];


/**
 * Real historical tender data migrated from the company's master tracking
 * spreadsheet ("Tenders Summary-2026 1.xlsx"): the legacy master summary plus
 * every yearly sheet and its matching "Awarded" sheet, 2020 through 2026.
 *
 * The JSON was produced by a one-off import pipeline run against every sheet
 * in chronological order, with header matching, status/location/source
 * normalization and AED-to-fils conversion, so a tender carried over from one
 * year to the next collapses into a single record. That pipeline and its admin
 * screen have since been removed; this file is the result. Money fields are
 * stored as strings (JSON has no BigInt) and converted back below.
 */
import importedSeedRaw from './importedSeed.json';

interface ImportedSeedJson {
  sources: Source[];
  consultants: Consultant[];
  clients: Client[];
  tenders: Array<Omit<Tender, 'tenderAmount' | 'targetPrice'> & { tenderAmount: string | null; targetPrice: string | null }>;
  awards: Array<Omit<Award, 'contractAmount'> & { contractAmount: string | null }>;
  followUps: FollowUp[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
}

const IMPORTED_SEED = importedSeedRaw as unknown as ImportedSeedJson;

function toBigIntOrNull(v: string | null): bigint | null {
  return v === null || v === undefined ? null : BigInt(v);
}

/**
 * Loads the real, migrated tender history (see IMPORTED_SEED above) instead
 * of generating fake demo data. Also returns sources/consultants/clients,
 * since the import discovers/creates records for names found in the
 * spreadsheet that are not already in the canonical roster above.
 */
export function generateSeedTenders(): {
  tenders: Tender[];
  awards: Award[];
  followUps: FollowUp[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
  sources: Source[];
  consultants: Consultant[];
  clients: Client[];
} {
  const tenders: Tender[] = IMPORTED_SEED.tenders.map((t) => ({
    ...t,
    tenderAmount: toBigIntOrNull(t.tenderAmount),
    targetPrice: toBigIntOrNull(t.targetPrice),
  })) as unknown as Tender[];

  const awards: Award[] = IMPORTED_SEED.awards.map((a) => ({
    ...a,
    contractAmount: toBigIntOrNull(a.contractAmount) as bigint,
  })) as unknown as Award[];

  return {
    tenders,
    awards,
    followUps: IMPORTED_SEED.followUps || [],
    activityLogs: IMPORTED_SEED.activityLogs || [],
    notifications: IMPORTED_SEED.notifications || [],
    sources: IMPORTED_SEED.sources,
    consultants: IMPORTED_SEED.consultants,
    clients: IMPORTED_SEED.clients,
  };
}
