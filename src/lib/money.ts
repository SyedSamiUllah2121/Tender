/**
 * Money utilities:
 * Money is stored as integer fils (1 AED = 100 fils) to avoid float errors.
 */

export function toFils(aed: number | string | null | undefined): bigint | null {
  if (aed === null || aed === undefined || aed === '') return null;
  const num = typeof aed === 'string' ? parseFloat(aed.replace(/,/g, '').trim()) : aed;
  if (isNaN(num)) return null;
  // 1 AED = 100 fils
  return BigInt(Math.round(num * 100));
}

export function fromFils(fils: bigint | number | null | undefined): number | null {
  if (fils === null || fils === undefined) return null;
  const val = typeof fils === 'bigint' ? Number(fils) : fils;
  return val / 100;
}

export function formatAED(fils: bigint | number | null | undefined): string {
  const aed = fromFils(fils);
  if (aed === null) return '—';
  return `AED ${Math.round(aed).toLocaleString('en-US')}`;
}

export function formatCompact(fils: bigint | number | null | undefined): string {
  const aed = fromFils(fils);
  if (aed === null) return '—';
  if (Math.abs(aed) >= 1_000_000) {
    return `AED ${(aed / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (Math.abs(aed) >= 1_000) {
    return `AED ${(aed / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`;
  }
  return `AED ${Math.round(aed).toLocaleString('en-US')}`;
}
