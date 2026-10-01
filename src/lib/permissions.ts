import { User, Role, Tender, FULL_ACCESS_ROLES } from '../types';

export type Action =
  | 'see_all_tenders'
  | 'create_tender'
  | 'edit_tender'
  | 'change_status'
  | 'log_followup'
  | 'comment'
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
 * Team administration: Admin 1 runs it day to day, and the Manager has it as
 * part of full access to everything.
 */
export function canManagePeople(user: User | null | undefined): boolean {
  return Boolean(user && user.isActive && (user.role === 'ADMIN_1' || user.role === 'MANAGER'));
}

/**
 * Senior accounts. Only the Manager creates, changes or removes them, so
 * Admin 1 cannot raise anyone (themselves included) to their own level or
 * above, nor lock the Manager out.
 */
export const SENIOR_ROLES: Role[] = ['MANAGER', 'ADMIN_1'];

/** Whether `actor` may edit this person, set their password, or (de)activate or remove them. */
export function canManagePerson(actor: User | null | undefined, target: User): boolean {
  if (!canManagePeople(actor)) return false;
  if (actor!.role === 'MANAGER') return true;
  return !SENIOR_ROLES.includes(target.role);
}

/** The roles `actor` may give someone, in display order. */
export function assignableRoles(actor: User | null | undefined): Role[] {
  if (!canManagePeople(actor)) return [];
  const all: Role[] = ['MANAGER', 'ADMIN_1', 'ADMIN_2', 'SALESPERSON', 'DUBAI_VILLAS'];
  return actor!.role === 'MANAGER' ? all : all.filter((r) => !SENIOR_ROLES.includes(r));
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

/**
 * Whether a tender is in the user's territory. Applies to the Manager and both
 * Admins: "All UAE" covers everything, Abu Dhabi or Dubai covers that region.
 * The header shows this scope, so the data has to honour it too.
 */
function inTerritory(user: User, tender: Tender): boolean {
  return user.region === 'ALL' || tender.region === user.region;
}

function isInScope(user: User, tender: Tender): boolean {
  if (hasFullAccess(user)) return inTerritory(user, tender) || isOwnTender(user, tender);
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

    // On a given tender, everyone (admins included) is held to their scope:
    // their own tenders, plus their territory for the Manager and Admins.
    case 'edit_tender':
    case 'log_followup':
    case 'change_status':
    case 'comment':
      if (!resource) return true;
      return isInScope(user, resource);

    // Assigning tenders to a salesperson: Manager, Admin 1 and Admin 2.
    case 'reassign_owner':
    case 'record_award':
      return full;

    // Reopening a closed (Awarded / Rejected) tender reverses a commercial
    // decision, and deleting one removes the record: both are the Manager's.
    case 'revert_terminal_status':
    case 'soft_delete':
      return role === 'MANAGER';

    // Sources and consultants: department administration.
    case 'manage_admin':
      return full;

    // Team administration in general; which accounts and roles is decided by
    // canManagePerson and assignableRoles.
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
  // Lists and single tenders go through the same rule, so a list can never
  // show a tender that would refuse to open. "All UAE" admins skip the work.
  if (hasFullAccess(user) && user.region === 'ALL') return live;
  return live.filter((t) => isInScope(user, t));
}
