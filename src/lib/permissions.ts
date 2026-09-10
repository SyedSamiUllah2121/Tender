import { User, Role, Tender } from '../types';

export type Action =
  | 'see_all_tenders'
  | 'create_tender'
  | 'edit_tender'
  | 'change_status'
  | 'reassign_owner'
  | 'record_award'
  | 'soft_delete'
  | 'manage_admin'
  | 'import_excel'
  | 'export_excel'
  | 'company_reports';

/**
 * Single permission function: can(user, action, resource)
 */
export function can(user: User | null | undefined, action: Action, resource?: Tender): boolean {
  if (!user || !user.isActive) return false;

  const role = user.role;

  switch (action) {
    case 'see_all_tenders':
      return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'VIEWER';

    case 'create_tender':
      return role !== 'VIEWER';

    case 'edit_tender':
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
      if (role === 'USER') {
        if (!resource) return true;
        return resource.ownerId === user.id || resource.source?.userId === user.id;
      }
      return false;

    case 'change_status':
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
      if (role === 'MANAGER' || role === 'USER') {
        if (!resource) return true;
        return resource.ownerId === user.id;
      }
      return false;

    case 'reassign_owner':
    case 'record_award':
    case 'soft_delete':
    case 'manage_admin':
      return role === 'SUPER_ADMIN' || role === 'ADMIN';

    case 'import_excel':
      return role === 'SUPER_ADMIN' || role === 'ADMIN';

    case 'export_excel':
      return role !== 'VIEWER';

    case 'company_reports':
      return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'VIEWER';

    default:
      return false;
  }
}

/**
 * Checks if a specific tender is accessible by the user.
 * For USER role: only if they own it or if they were the source that brought it in.
 */
export function canAccessTender(user: User | null | undefined, tender: Tender): boolean {
  if (!user) return false;
  if (tender.deletedAt) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'VIEWER') {
    return true;
  }
  // USER role:
  return tender.ownerId === user.id || tender.source?.userId === user.id;
}

/**
 * Filters list of tenders scoped by user role at data layer.
 * A regular user must never receive another user's tender.
 */
export function scopeTenders(tenders: Tender[], user: User): Tender[] {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'VIEWER') {
    return tenders.filter((t) => !t.deletedAt);
  }
  // USER role:
  return tenders.filter(
    (t) => !t.deletedAt && (t.ownerId === user.id || t.source?.userId === user.id)
  );
}
