import { TenderStatus, Region, SourceKind } from '../types';

/**
 * [REFERENCE A] Status normalization map
 */
export function normalizeStatus(raw: string | null | undefined): { status: TenderStatus; region?: Region } {
  if (!raw) return { status: 'DRAFT' };
  const trimmed = raw.trim().toLowerCase();

  if (trimmed === 'rejected' || trimmed.startsWith('reject')) {
    return { status: 'REJECTED' };
  }
  if (trimmed === 'submitted' || trimmed.startsWith('submit')) {
    return { status: 'SUBMITTED' };
  }
  if (trimmed === 'awarded-d') {
    return { status: 'AWARDED', region: 'DUBAI' };
  }
  if (trimmed === 'awarded' || trimmed.startsWith('award')) {
    return { status: 'AWARDED' };
  }
  if (trimmed === 'canceled' || trimmed === 'cancelled' || trimmed.startsWith('cancel')) {
    return { status: 'CANCELLED' };
  }
  if (trimmed === 'under review' || trimmed === 'under-review' || trimmed === 'underreview') {
    return { status: 'UNDER_REVIEW' };
  }
  if (trimmed === 'on hold' || trimmed === 'on-hold' || trimmed === 'delay') {
    return { status: 'ON_HOLD' };
  }
  if (trimmed === 'draft') {
    return { status: 'DRAFT' };
  }

  return { status: 'DRAFT' };
}

/**
 * [REFERENCE B] Canonical Sources and Aliases Map
 */
export interface SourceDefinition {
  canonical: string;
  kind: SourceKind;
  emailPrefix?: string;
  aliases: string[];
}

export const CANONICAL_SOURCES: SourceDefinition[] = [
  {
    canonical: 'Engr Hassan',
    kind: 'PERSON',
    emailPrefix: 'hassan@',
    aliases: ['eng hassan', 'engr hassan', 'sir engr hassan', 'eng.hassan', 'eng. hassan'],
  },
  {
    canonical: 'Sir Yaqoob',
    kind: 'PERSON',
    emailPrefix: 'yaqoob@',
    aliases: ['eng yaqub', 'sir yaqoob', 'yaqoob', 'engr yaqub'],
  },
  {
    canonical: 'Engr Bilal',
    kind: 'PERSON',
    emailPrefix: 'bilal@',
    aliases: ['engr bilal', 'eng bilal', 'sir engr bilal', 'bilal'],
  },
  {
    canonical: 'Engr Shahzaib',
    kind: 'PERSON',
    emailPrefix: 'shahzaib@',
    aliases: ['eng. shahzaib', 'eng syed shahzaib', 'engr shahzaib', 'shahzaib'],
  },
  {
    canonical: 'Engr Waqas',
    kind: 'PERSON',
    emailPrefix: 'waqas@',
    aliases: ['eng waqas', 'engr waqas', 'waqas'],
  },
  {
    canonical: 'Engr Zeeshan',
    kind: 'PERSON',
    emailPrefix: 'zeeshan@',
    aliases: ['engr zeeshan dubai', 'engr zeeshan', 'sir engr zeeshan', 'zeeshan'],
  },
  {
    canonical: 'Ihsan Sahib',
    kind: 'PERSON',
    emailPrefix: 'ihsan@',
    aliases: ['ihsan sahib', 'sir ihsan sb.', 'engr ihsan', 'ihsan'],
  },
  {
    canonical: 'Eng Ali Rehman',
    kind: 'PERSON',
    aliases: ['eng ali rehman', 'ali rehman'],
  },
  {
    canonical: 'Email',
    kind: 'EMAIL',
    aliases: ['mailed', 'mail', 'by email', 'by email', 'malied'],
  },
  {
    canonical: 'FAB Email',
    kind: 'EMAIL',
    aliases: ['fab mail', 'fab mailed', 'fab'],
  },
  {
    canonical: 'CD Tender',
    kind: 'OTHER',
    aliases: ['cd tender', 'cd'],
  },
];

/**
 * Normalizes a single source segment
 */
function resolveSingleSource(rawSegment: string): SourceDefinition | null {
  const norm = rawSegment.trim().toLowerCase();
  if (!norm) return null;

  for (const src of CANONICAL_SOURCES) {
    if (src.canonical.toLowerCase() === norm) return src;
    for (const alias of src.aliases) {
      if (alias.toLowerCase() === norm) return src;
    }
  }

  // Partial match checks
  for (const src of CANONICAL_SOURCES) {
    for (const alias of src.aliases) {
      if (norm.includes(alias.toLowerCase()) || alias.toLowerCase().includes(norm)) {
        return src;
      }
    }
  }

  return null;
}

/**
 * Normalizes source strings, including compound values like "Eng.Yaqoob/FAB",
 * "Eng Hassan/Eng Bilal", "Mail/FAB Mail".
 * Returns primary canonical name and kind, plus whether it matched.
 */
export function normalizeSourceName(raw: string | null | undefined): {
  canonicalName: string;
  kind: SourceKind;
  isCompound: boolean;
  matched: boolean;
} {
  if (!raw || !raw.trim()) {
    return { canonicalName: 'Other', kind: 'OTHER', isCompound: false, matched: false };
  }

  const trimmed = raw.trim();

  // Check for compound values with '/'
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => p.trim()).filter(Boolean);
    const resolvedParts = parts.map((p) => resolveSingleSource(p));

    // Per rules: assign the FIRST person source as the primary sourceId
    const firstPerson = resolvedParts.find((r) => r && r.kind === 'PERSON');
    if (firstPerson) {
      return {
        canonicalName: firstPerson.canonical,
        kind: firstPerson.kind,
        isCompound: true,
        matched: true,
      };
    }

    const firstValid = resolvedParts.find((r) => r !== null);
    if (firstValid) {
      return {
        canonicalName: firstValid.canonical,
        kind: firstValid.kind,
        isCompound: true,
        matched: true,
      };
    }

    return {
      canonicalName: parts[0] || trimmed,
      kind: 'OTHER',
      isCompound: true,
      matched: false,
    };
  }

  const single = resolveSingleSource(trimmed);
  if (single) {
    return {
      canonicalName: single.canonical,
      kind: single.kind,
      isCompound: false,
      matched: true,
    };
  }

  return {
    canonicalName: trimmed,
    kind: 'OTHER',
    isCompound: false,
    matched: false,
  };
}

/**
 * [REFERENCE D] Location alias normalization map
 */
export const LOCATION_MAP: Record<string, string[]> = {
  'Madinat Al Riyad': ['madinat al riyad', 'riyadh city', 'riyad city', 'al riyad city', 'madinat alriyad', 'al riyadh'],
  'Zayed City': ['zayed city', 'madinat zayed', 'sheikh zayed city'],
  'Al Shamkhah': ['al shamkhah', 'al shamkha', 'shamkhah', 'shamkha', 'al shamkha south'],
  'Khalifa City': ['khalifa city', 'khalifa a', 'khalifa b', 'madinat khalifa'],
  'Baniyas': ['baniyas', 'baniyass', 'bani yas'],
  'Al Samhah': ['al samhah', 'al samha', 'samhah', 'samha'],
  'Shakhbout City': ['shakhbout city', 'skhabout city', 'shkbout city', 'shakhboot city'],
  'Al Shawamekh': ['al shawamekh', 'shawamekh', 'al shawekha', 'shawamikh'],
  'Yas Island': ['yas island', 'yas', 'jazirat yas'],
  'Mohamed Bin Zayed': ['mohamed bin zayed', 'mbz city', 'mbz', 'mohammed bin zayed'],
  'Al Bahya': ['al bahya', 'albahiya', 'al bahyah', 'al bahya new', 'bahya'],
  'Al Falah': ['al falah', 'falah', 'al fallah'],
  'Al Rahbah': ['al rahbah', 'al rahba', 'rahaba', 'rahba'],
  'Al Jubail Island': ['al jubail island', 'jubail island', 'jubail'],
  'Al Khatim': ['al khatim', 'khatim'],
  'Al Sader': ['al sader', 'sader', 'al sadr'],
  'Al Awir First': ['al awir first', 'al awir', 'al aweer'],
  'Wadi Al Shabak': ['wadi al shabak', 'wadi alshabak'],
  'Al Barsha Third': ['al barsha third', 'al barsha', 'barsha'],
};

export function normalizeLocation(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'Unknown';
  const clean = raw.trim().toLowerCase();

  for (const [canonical, aliases] of Object.entries(LOCATION_MAP)) {
    if (canonical.toLowerCase() === clean) return canonical;
    for (const alias of aliases) {
      if (clean === alias || clean.startsWith(alias) || alias.startsWith(clean)) {
        return canonical;
      }
    }
  }

  // Capitalize nicely
  return raw.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
}

/**
 * Excel Date parser:
 * Handles:
 * 1. Excel serial numbers (e.g. 43598 -> 13 May 2019)
 * 2. String dates like "25/5/19" or "25/05/2019" (DD/MM/YY UAE convention)
 * 3. Standard Date / ISO formats
 */
export function parseExcelDate(val: any): Date | null {
  if (!val) return null;

  // If already Date
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Numeric serial number (e.g. 43598)
  const num = typeof val === 'number' ? val : Number(val);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel epoch starts Dec 30 1899 due to 1900 leap year bug
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + num * 86400000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // String date
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Matches DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      const d = new Date(Date.UTC(year, month, day));
      return isNaN(d.getTime()) ? null : d;
    }

    // Try standard Date.parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}
