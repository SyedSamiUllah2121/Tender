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
import { CANONICAL_SOURCES } from '../normalize';

export const SEED_USERS: User[] = [
  {
    id: 'u_hassan',
    email: 'hassan@inspire.ae',
    name: 'Mr. Hassan',
    role: 'SUPER_ADMIN',
    phone: '+971501112233',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'u_bilal',
    email: 'bilal@inspire.ae',
    name: 'Engr. Bilal',
    role: 'USER',
    phone: '+971502223344',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-05T08:00:00Z',
  },
  {
    id: 'u_shahzaib',
    email: 'shahzaib@inspire.ae',
    name: 'Engr. Shahzaib',
    role: 'USER',
    phone: '+971503334455',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'u_waqas',
    email: 'waqas@inspire.ae',
    name: 'Waqas',
    role: 'USER',
    phone: '+971504445566',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'u_yaqoob',
    email: 'yaqoob@inspire.ae',
    name: 'Yaqoob',
    role: 'USER',
    phone: '+971505556677',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'u_zeeshan',
    email: 'zeeshan@inspire.ae',
    name: 'Engr. Zeeshan',
    role: 'USER',
    phone: '+971506667788',
    isActive: true,
    region: 'DUBAI',
    createdAt: '2024-01-20T08:00:00Z',
  },
  {
    id: 'u_ihsan',
    email: 'ihsan@inspire.ae',
    name: 'Ihsan',
    role: 'MANAGER',
    phone: '+971507778899',
    isActive: true,
    region: 'ABU_DHABI',
    createdAt: '2024-01-01T08:00:00Z',
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
 * Generate ~60 realistic tenders for 2024–2026:
 * Status breakdown:
 * - ~65% Rejected (39 items) with realistic reject reasons
 * - ~25% Submitted / Under Review (15 items) with nextFollowUpAt
 * - ~7% Awarded (4 items) with PJ/N project numbers & awards
 * - ~3% Cancelled / On Hold (2 items)
 */
export function generateSeedTenders(): {
  tenders: Tender[];
  awards: Award[];
  followUps: FollowUp[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
} {
  const tenders: Tender[] = [];
  const awards: Award[] = [];
  const followUps: FollowUp[] = [];
  const activityLogs: ActivityLog[] = [];
  const notifications: Notification[] = [];

  const locations = [
    'Madinat Al Riyad',
    'Zayed City',
    'Al Shamkhah',
    'Khalifa City',
    'Baniyas',
    'Al Samhah',
    'Shakhbout City',
    'Al Shawamekh',
    'Yas Island',
    'Mohamed Bin Zayed',
    'Al Bahya',
    'Al Awir First',
  ];

  const projectDetailTemplates = [
    'Villa Block & Boundary Wall',
    'Villa Block, Service Block & Boundary Wall',
    'Proposed Villa Block, Maintenance of Existing Villa & Boundary Wall',
    'Villa Block, Elec & B.Wall',
    'Architecture Work Only',
    'Existing Villa Block & B.Wall',
    'G+1 Residential Villa & Boundary Wall',
  ];

  const salesUsers = SEED_USERS.filter((u) => u.role === 'USER');
  const now = new Date();

  // Helper to subtract days
  const subDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() - days);
    return res.toISOString();
  };

  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res.toISOString();
  };

  let nextTenderNo = 1200;
  let nextProjectNo = 210;

  // Let's create specific high-profile items first, including Bilal's and Yaqoob's for acceptance tests!
  // 1. Bilal's Tender #1201 (Submitted, Overdue follow-up for worklist test)
  const bilalTender: Tender = {
    id: 'tnd_1201',
    tenderNumber: 1201,
    serialNo: 1,
    fiscalYear: 2026,
    revision: 'Initial',
    clientId: 'cli_1',
    clientNameRaw: 'Mr. Saleh Salem Ali Al Minhali',
    location: 'Madinat Al Riyad',
    region: 'ABU_DHABI',
    status: 'SUBMITTED',
    statusUpdatedAt: subDays(now, 35),
    tenderAmount: toFils(2450000), // AED 2,450,000
    targetPrice: toFils(2300000),
    totalAreaSqm: 820, // ~2,987 AED/sqm (competitive)
    projectDetails: 'Villa Block, Service Block & Boundary Wall',
    remarks: 'Tender received via consultant. Submitted on time.',
    commissionNote: '2%',
    sourceId: 'src_3', // Engr Bilal
    sourceRaw: 'Engr Bilal',
    ownerId: 'u_bilal',
    consultantId: 'cons_1',
    receivedAt: subDays(now, 45),
    submittedAt: subDays(now, 35),
    targetDate: subDays(now, 36),
    nextFollowUpAt: subDays(now, 5), // Overdue by 5 days!
    createdAt: subDays(now, 45),
    updatedAt: subDays(now, 35),
  };
  tenders.push(bilalTender);

  followUps.push({
    id: 'fu_1',
    tenderId: 'tnd_1201',
    userId: 'u_bilal',
    userName: 'Engr. Bilal',
    contactedAt: subDays(now, 20),
    method: 'Call',
    outcome: 'Spoke with Eng Mohamad Alsharaa. Client is reviewing tender breakdown.',
    nextActionAt: subDays(now, 5),
    createdAt: subDays(now, 20),
  });

  notifications.push({
    id: 'notif_1',
    userId: 'u_bilal',
    type: 'FOLLOWUP_DUE',
    title: 'Follow-up overdue: Tender #1201',
    body: 'Follow-up with client Mr. Saleh Salem Ali Al Minhali is overdue by 5 days.',
    linkUrl: '/tenders/tnd_1201',
    createdAt: subDays(now, 5),
  });

  // 2. Yaqoob's Tender #1202 (for 403 test when Bilal logs in)
  const yaqoobTender: Tender = {
    id: 'tnd_1202',
    tenderNumber: 1202,
    serialNo: 2,
    fiscalYear: 2026,
    revision: 'Initial',
    clientId: 'cli_2',
    clientNameRaw: 'Mr. Mubarak Saeed Al Mansoori',
    location: 'Zayed City',
    region: 'ABU_DHABI',
    status: 'UNDER_REVIEW',
    statusUpdatedAt: subDays(now, 15),
    tenderAmount: toFils(3100000),
    targetPrice: toFils(2950000),
    totalAreaSqm: 980,
    projectDetails: 'Proposed Villa Block, Maintenance of Existing Villa & Boundary Wall',
    remarks: 'Private meeting arranged with consultant',
    sourceId: 'src_2', // Sir Yaqoob
    sourceRaw: 'Sir Yaqoob',
    ownerId: 'u_yaqoob',
    consultantId: 'cons_2',
    receivedAt: subDays(now, 30),
    submittedAt: subDays(now, 20),
    targetDate: subDays(now, 21),
    nextFollowUpAt: addDays(now, 10),
    createdAt: subDays(now, 30),
    updatedAt: subDays(now, 15),
  };
  tenders.push(yaqoobTender);

  // 3. Awarded Tender #1203 (with PJ/N 210)
  const awardTender1: Tender = {
    id: 'tnd_1203',
    tenderNumber: 1203,
    serialNo: 3,
    fiscalYear: 2026,
    revision: 'Initial',
    clientId: 'cli_3',
    clientNameRaw: 'Mr. Ahmed Hamad Al Zaabi',
    location: 'Madinat Al Riyad',
    region: 'ABU_DHABI',
    status: 'AWARDED',
    statusUpdatedAt: subDays(now, 10),
    tenderAmount: toFils(2850000),
    targetPrice: toFils(2700000),
    totalAreaSqm: 950,
    projectDetails: 'Villa Block & Boundary Wall',
    remarks: 'Contract signed. Down payment received.',
    sourceId: 'src_1', // Engr Hassan
    sourceRaw: 'Eng Hassan',
    ownerId: 'u_hassan',
    consultantId: 'cons_1',
    receivedAt: subDays(now, 60),
    submittedAt: subDays(now, 45),
    targetDate: subDays(now, 46),
    createdAt: subDays(now, 60),
    updatedAt: subDays(now, 10),
  };
  tenders.push(awardTender1);

  const award1: Award = {
    id: 'awd_1',
    tenderId: 'tnd_1203',
    projectNumber: 210,
    contractAmount: toFils(2800000)!,
    contractDate: subDays(now, 10),
    targetMonth: 'February 2026',
    handoverNotes: 'Handed over to Site PM Engr Tariq. NOC in progress.',
    createdAt: subDays(now, 10),
  };
  awards.push(award1);

  // 4. Dubai Awarded Tender #1204 (Awarded in Dubai, PJ/N 211)
  const awardTenderDubai: Tender = {
    id: 'tnd_1204',
    tenderNumber: 1204,
    serialNo: 4,
    fiscalYear: 2026,
    revision: 'Initial',
    clientId: 'cli_11',
    clientNameRaw: 'Mr. Butti Suhail Al Maktoum',
    location: 'Al Awir First',
    region: 'DUBAI',
    status: 'AWARDED',
    statusUpdatedAt: subDays(now, 18),
    tenderAmount: toFils(3400000),
    targetPrice: toFils(3200000),
    totalAreaSqm: 1100,
    projectDetails: 'Villa Block, Service Block & Boundary Wall',
    remarks: 'Awarded in Dubai. Dubai municipality permit ready.',
    sourceId: 'src_6', // Engr Zeeshan
    sourceRaw: 'Engr Zeeshan Dubai',
    ownerId: 'u_zeeshan',
    consultantId: 'cons_9',
    receivedAt: subDays(now, 70),
    submittedAt: subDays(now, 50),
    targetDate: subDays(now, 51),
    createdAt: subDays(now, 70),
    updatedAt: subDays(now, 18),
  };
  tenders.push(awardTenderDubai);

  const awardDubai: Award = {
    id: 'awd_2',
    tenderId: 'tnd_1204',
    projectNumber: 211,
    contractAmount: toFils(3350000)!,
    contractDate: subDays(now, 18),
    targetMonth: 'January 2026',
    handoverNotes: 'Dubai team mobilization commenced.',
    createdAt: subDays(now, 18),
  };
  awards.push(awardDubai);

  // 5. Tender with 0 area (Test requirement: "A tender with Total Area In SQM = 0 shows a blank price/sqm, not Infinity or a crash")
  const zeroAreaTender: Tender = {
    id: 'tnd_1205',
    tenderNumber: 1205,
    serialNo: 5,
    fiscalYear: 2026,
    revision: 'Initial',
    clientId: 'cli_4',
    clientNameRaw: 'Mr. Sultan Obaid Al Dhaheri',
    location: 'Baniyas',
    region: 'ABU_DHABI',
    status: 'SUBMITTED',
    statusUpdatedAt: subDays(now, 12),
    tenderAmount: toFils(1800000),
    targetPrice: toFils(1700000),
    totalAreaSqm: 0, // Explicitly 0 to test derive function
    projectDetails: 'Boundary Wall & External Paving Only',
    remarks: 'No building area; civil boundary wall scope.',
    sourceId: 'src_3',
    sourceRaw: 'Eng Bilal',
    ownerId: 'u_bilal',
    consultantId: 'cons_3',
    receivedAt: subDays(now, 25),
    submittedAt: subDays(now, 12),
    nextFollowUpAt: addDays(now, 18),
    createdAt: subDays(now, 25),
    updatedAt: subDays(now, 12),
  };
  tenders.push(zeroAreaTender);

  nextTenderNo = 1206;
  nextProjectNo = 212;

  // Generate remaining ~55 tenders to reach ~60 total across 2024, 2025, and 2026
  const rejectReasons = [
    'PRICE_TOO_HIGH',
    'PRICE_TOO_HIGH',
    'AWARDED_TO_COMPETITOR',
    'CLIENT_DELAY',
    'NO_RESPONSE',
    'SCOPE_MISMATCH',
    'CLIENT_CANCELLED',
  ] as const;

  for (let i = 0; i < 55; i++) {
    const tNo = nextTenderNo++;
    const year = i < 15 ? 2024 : i < 35 ? 2025 : 2026;
    const client = SEED_CLIENTS[i % SEED_CLIENTS.length];
    const loc = locations[i % locations.length];
    const reg: 'ABU_DHABI' | 'DUBAI' = loc === 'Al Awir First' ? 'DUBAI' : 'ABU_DHABI';
    const owner = reg === 'DUBAI' ? SEED_USERS.find((u) => u.region === 'DUBAI')! : salesUsers[i % salesUsers.length];
    const consultant = SEED_CONSULTANTS[i % SEED_CONSULTANTS.length];
    const source = SEED_SOURCES[i % SEED_SOURCES.length];

    // Determine status based on requested distribution:
    // ~65% Rejected, ~25% Submitted/Under Review, ~7% Awarded, ~3% Cancelled
    let status: TenderStatus;
    const rand = Math.random();
    if (rand < 0.65) {
      status = 'REJECTED';
    } else if (rand < 0.82) {
      status = 'SUBMITTED';
    } else if (rand < 0.90) {
      status = 'UNDER_REVIEW';
    } else if (rand < 0.97) {
      status = 'AWARDED';
    } else {
      status = Math.random() > 0.5 ? 'CANCELLED' : 'ON_HOLD';
    }

    const area = Math.floor(400 + Math.random() * 750); // 400 - 1150 sqm
    // If rejected, often > 3,500 AED/sqm; if awarded, 2,500 - 3,200 AED/sqm
    let ratePerSqm = status === 'AWARDED' ? 2600 + Math.random() * 500 : status === 'REJECTED' ? 3200 + Math.random() * 800 : 2800 + Math.random() * 600;
    const tenderAmountNum = Math.round((area * ratePerSqm) / 10000) * 10000;
    const targetPriceNum = Math.round(tenderAmountNum * 0.93);

    const daysAgo = (2026 - year) * 365 + Math.floor(Math.random() * 120);
    const recDate = subDays(now, daysAgo + 20);
    const subDate = subDays(now, daysAgo + 5);

    const tender: Tender = {
      id: `tnd_${tNo}`,
      tenderNumber: tNo,
      serialNo: i + 6,
      fiscalYear: year,
      revision: status === 'REJECTED' && Math.random() > 0.7 ? 'Rev 1' : 'Initial',
      clientId: client.id,
      clientNameRaw: client.name,
      location: loc,
      region: reg,
      status,
      statusUpdatedAt: subDays(now, daysAgo),
      tenderAmount: toFils(tenderAmountNum),
      targetPrice: toFils(targetPriceNum),
      totalAreaSqm: area,
      projectDetails: projectDetailTemplates[i % projectDetailTemplates.length],
      remarks: status === 'REJECTED' ? 'Client awarded to low-bid contractor.' : status === 'AWARDED' ? 'Final contract executed.' : 'Under evaluation by engineering team.',
      commissionNote: i % 4 === 0 ? '4%+2%' : i % 3 === 0 ? '2%' : undefined,
      sourceId: source.id,
      sourceRaw: source.name,
      ownerId: owner.id,
      consultantId: consultant.id,
      receivedAt: recDate,
      submittedAt: subDate,
      targetDate: subDays(now, daysAgo + 7),
      nextFollowUpAt: status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? (i % 3 === 0 ? subDays(now, 3) : addDays(now, 14)) : null,
      rejectReason: status === 'REJECTED' ? rejectReasons[i % rejectReasons.length] : null,
      rejectNote: status === 'REJECTED' ? 'Price discrepancy vs competitor quotations.' : null,
      createdAt: recDate,
      updatedAt: subDays(now, daysAgo),
    };

    tenders.push(tender);

    if (status === 'AWARDED') {
      const pNo = nextProjectNo++;
      awards.push({
        id: `awd_${pNo}`,
        tenderId: tender.id,
        projectNumber: pNo,
        contractAmount: toFils(Math.round(tenderAmountNum * 0.98))!,
        contractDate: subDays(now, daysAgo),
        targetMonth: `${year}`,
        handoverNotes: 'Site mobilization scheduled.',
        createdAt: subDays(now, daysAgo),
      });
    }

    // Add activity log for creation
    activityLogs.push({
      id: `act_${tNo}_1`,
      tenderId: tender.id,
      userId: owner.id,
      userName: owner.name,
      action: 'CREATED',
      field: 'status',
      oldValue: null,
      newValue: 'DRAFT',
      createdAt: recDate,
    });

    if (status !== 'SUBMITTED') {
      activityLogs.push({
        id: `act_${tNo}_2`,
        tenderId: tender.id,
        userId: owner.id,
        userName: owner.name,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'SUBMITTED',
        newValue: status,
        createdAt: subDays(now, daysAgo),
      });
    }
  }

  return { tenders, awards, followUps, activityLogs, notifications };
}
