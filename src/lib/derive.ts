import { fromFils } from './money';

/**
 * Derived metrics:
 * pricePerSqm is DERIVED: tenderAmount / totalAreaSqm. Never store it.
 * Return null when area is missing or <= 0.
 */
export function pricePerSqm(
  tenderAmountFils: bigint | number | null | undefined,
  totalAreaSqm: number | null | undefined
): number | null {
  if (!totalAreaSqm || totalAreaSqm <= 0) return null;
  const aed = fromFils(tenderAmountFils);
  if (aed === null || aed <= 0) return null;
  const val = aed / totalAreaSqm;
  if (!isFinite(val)) return null;
  return Math.round(val * 100) / 100;
}

export function formatPricePerSqm(
  tenderAmountFils: bigint | number | null | undefined,
  totalAreaSqm: number | null | undefined
): string {
  const pps = pricePerSqm(tenderAmountFils, totalAreaSqm);
  if (pps === null) return '—';
  return `AED ${Math.round(pps).toLocaleString('en-US')}/m²`;
}
