import { User, Role, Tender, FULL_ACCESS_ROLES } from '../types';

export type Action =
  | 'see_all_tenders'
  | 'create_tender'
  | 'edit_tender'
  | 'change_status'
  | 'log_followup'
  | 'reassign_owner'
  | 'record_award'
  | 'revert_terminal_status'
  | 'soft_delete'
  | 'manage_admin'
  | 'manage_users'
  | 'monitor_department'
  | 'export_excel'
  | 'company_reports';

/** Manager, Admin 1 and Admin 2 see and administer the whole department. */
export function hasFullAccess(user: User | null | undefined): boolean {
  return Boolean(user && user.isActive && FULL_ACCESS_ROLES.includes(user.role));
}

/**
 * Adding persons and editing roles & permissions: Admin 1 owns this, and the
 * Manager has it too as part of full access to the department.
 */
export function canManagePeople(user: User | null | undefined): boolean {
  return Boolean(user && user.isActive && (user.role === 'ADMIN_1' || user.role === 'MANAGER'));
}

const VILLA_PATTERN = /villa/i;

/**
 * Engr. Zeeshan's scope: Dubai villa tenders/projects only.
 * A tender counts as a Dubai villa when it sits in the Dubai region and the
 * project details, location or client record mention a villa.
 */
export function isDubaiVillaTender(tender: Tender): boolean {
  if (tender.region !== 'DUBAI') return false;
  const haystack = [tender.projectDetails, tender.location, tender.clientNameRaw, tender.remarks]
    .filter(Boolean)
    .join(' ');
  return VILLA_PATTERN.test(haystack);
}

/** Tenders a scoped user (salesperson / Dubai villas) is allowed to touch. */
function isOwnTender(user: User, tender: Tender): boolean {
  return tender.ownerId === user.id || tender.source?.userId === user.id;
}

function isInScope(user: User, tender: Tender): boolean {
  if (hasFullAccess(user)) return true;
  if (user.role === 'DUBAI_VILLAS') {
    return isDubaiVillaTender(tender) || isOwnTender(user, tender);
  }
  return isOwnTender(user, tender);
}

/**
 * Single permission function: can(user, action, resource)
 */
export function can(user: User | null | undefined, action: Action, resource?: Tender): boolean {
  if (!user || !user.isActive) return false;

  const role: Role = user.role;
  const full = hasFullAccess(user);

  switch (action) {
    case 'see_all_tenders':
    case 'monitor_department':
    case 'company_reports':
      return full;

    case 'create_tender':
      return true;

    case 'edit_tender':
    case 'log_followup':
      if (full) return true;
      if (!resource) return true;
      return isInScope(user, resource);

    case 'change_status':
      if (full) return true;
      if (!resource) return true;
      return isInScope(user, resource);

    // Assigning tenders to a salesperson: Manager, Admin 1 and Admin 2.
    case 'reassign_owner':
    case 'record_award':
      return full;

    // Reversing a closed (Awarded / Rejected) tender is an administration act.
    case 'revert_terminal_status':
    case 'soft_delete':
      return role === 'ADMIN_1' || role === 'MANAGER';

    // Sources and consultants: department administration.
    case 'manage_admin':
      return full;

    // Adding persons and editing roles & permissions.
    case 'manage_users':
      return role === 'ADMIN_1' || role === 'MANAGER';

    case 'export_excel':
      return true;

    default:
      return false;
  }
}

/**
 * Checks if a specific tender is accessible by the user.
 * Salespeople: only tenders they own or sourced.
 * Dubai Villas: Dubai villa tenders, plus anything assigned to them.
 */
export function canAccessTender(user: User | null | undefined, tender: Tender): boolean {
  if (!user || !user.isActive) return false;
  if (tender.deletedAt) return false;
  return isInScope(user, tender);
}

/**
 * Filters list of tenders scoped by user role at data layer.
 * A salesperson must never receive another salesperson's tender.
 */
export function scopeTenders(tenders: Tender[], user: User): Tender[] {
  const live = tenders.filter((t) => !t.deletedAt);
  if (hasFullAccess(user)) return live;
  return live.filter((t) => isInScope(user, t));
}
