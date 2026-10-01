'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  Lock,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  CircleAlert,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { personInitial } from '../lib/initials';
import { tenderRepository, MIN_PASSWORD_LENGTH } from '../lib/repositories/tenderRepository';
import { DEFAULT_PASSWORD } from '../lib/repositories/seedData';
import { User, Role, Region, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../types';
import { can, canManagePeople, canManagePerson, assignableRoles } from '../lib/permissions';
import { AccessDenied } from '../components/ui/AccessDenied';
import { useModalDismiss } from '../lib/useModalDismiss';

const ICON_BTN =
  'p-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';

const ROLE_ORDER: Role[] = ['MANAGER', 'ADMIN_1', 'ADMIN_2', 'SALESPERSON', 'DUBAI_VILLAS'];

const ROLE_BADGE: Record<Role, string> = {
  MANAGER: 'bg-blue-50 text-blue-700 border-blue-300',
  ADMIN_1: 'bg-purple-50 text-purple-700 border-purple-300',
  ADMIN_2: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  SALESPERSON: 'bg-slate-100 text-slate-700 border-slate-300',
  DUBAI_VILLAS: 'bg-amber-50 text-amber-800 border-amber-300',
};

interface PersonForm {
  name: string;
  email: string;
  phone: string;
  role: Role;
  region: Region | 'ALL';
  /** Required for a new person; on an edit, left blank to keep the current one. */
  password: string;
}

const EMPTY_FORM: PersonForm = {
  name: '',
  email: '',
  phone: '',
  role: 'SALESPERSON',
  region: 'ABU_DHABI',
  password: '',
};

export const AdminUsersView: React.FC = () => {
  const { currentUser, dataVersion, refreshData } = useAuth();

  const [editing, setEditing] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  useModalDismiss(showModal, () => setShowModal(false));
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Set when Save was pressed with a password that is too short; the hint
  // under the field turns red and the field takes focus.
  const [passwordError, setPasswordError] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  /*
    The edit form opens with the person's current password in the field, so
    it is plain that one is set. Only a different value counts as a change;
    otherwise re-saving someone still on the short starting password would
    be refused for its length.
  */
  const [originalPassword, setOriginalPassword] = useState('');
  // What the last save did, shown above the roster for a few seconds.
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // The Manager and Admin 1 add persons and edit roles & permissions.
  const canEditPeople = canManagePeople(currentUser);
  // Admin 1 manages everyone below Admin 1; the Manager manages everyone.
  const rolesICanGive = assignableRoles(currentUser);
  const canViewRoster = can(currentUser, 'manage_admin');

  // The roster includes deactivated people so they can be reactivated.
  const roster = useMemo(
    () =>
      [...tenderRepository.getRoster()].sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name)
      ),
    [dataVersion]
  );

  const apply = (fn: () => void) => {
    try {
      fn();
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOriginalPassword('');
    setError(null);
    setPasswordError(false);
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    const current = user.password ?? DEFAULT_PASSWORD;
    setEditing(user);
    setOriginalPassword(current);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      region: user.region,
      password: current,
    });
    setError(null);
    setPasswordError(false);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setError(null);

    // Checked before anything is saved, so a short password cannot leave the
    // other edits applied and the password unchanged.
    const password = form.password;
    // On an edit, an untouched (or emptied) field keeps the current password.
    const passwordChanged = !editing || (password !== '' && password !== originalPassword);
    if (passwordChanged && password.trim().length < MIN_PASSWORD_LENGTH) {
      setPasswordError(true);
      passwordRef.current?.focus();
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      role: form.role,
      region: form.role === 'DUBAI_VILLAS' ? ('DUBAI' as const) : form.region,
    };

    try {
      if (editing) {
        tenderRepository.updateUser(currentUser, editing.id, payload);
        if (passwordChanged) tenderRepository.setPassword(currentUser, editing.id, password);
        setNotice(
          passwordChanged
            ? `Password updated for ${payload.name}. They now sign in as ${payload.email} with the new password.`
            : `Saved changes to ${payload.name}.`
        );
      } else {
        tenderRepository.createUser(currentUser, { ...payload, password, isActive: true });
        setNotice(`${payload.name} added. They sign in as ${payload.email} with the password you set.`);
      }
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      refreshData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  /*
    Deactivating or removing your own account signs you out: refreshData finds
    the session no longer active. Nobody is switched into another person's
    account, since that would skip their password.
  */
  const handleToggleActive = (user: User) => {
    if (
      user.id === currentUser.id &&
      user.isActive &&
      !window.confirm(
        'Deactivate your own account? You will be signed out and cannot sign in again until another administrator reactivates you.'
      )
    ) {
      return;
    }
    apply(() => tenderRepository.updateUser(currentUser, user.id, { isActive: !user.isActive }));
  };

  const handleChangeRole = (user: User, newRole: Role) =>
    apply(() =>
      tenderRepository.updateUser(currentUser, user.id, {
        role: newRole,
        region: newRole === 'DUBAI_VILLAS' ? 'DUBAI' : user.region,
      })
    );

  const handleChangeRegion = (user: User, newRegion: Region | 'ALL') =>
    apply(() => tenderRepository.updateUser(currentUser, user.id, { region: newRegion }));

  const handleDelete = (user: User) => {
    const owned = tenderRepository.countTendersOwnedBy(user.id);
    const warning = owned
      ? `\n\n${user.name} is assigned ${owned} tender(s). They stay in the system under ${user.name}'s name — reassign them if someone else should follow up.`
      : '';
    const self =
      user.id === currentUser.id
        ? '\n\nThis is your own account — you will be signed out.'
        : '';
    if (!window.confirm(`Remove ${user.name} from the Tendering Department?${warning}${self}`)) {
      return;
    }
    apply(() => tenderRepository.deleteUser(currentUser, user.id));
  };

  if (!canViewRoster) {
    return (
      <AccessDenied requirement="Only the Manager, Admin 1 and Admin 2 can view the department roster." />
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Tendering Department — Roles &amp; Access
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manager, Admin 1 and Admin 2 monitor the whole department. Sources see only their own
            assigned tenders and follow-ups.
          </p>
        </div>

        {canEditPeople && (
          <button
            type="button"
            onClick={openAdd}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        )}
      </div>

      {!canEditPeople && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 border border-amber-300 text-xs text-amber-900">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Read-only. The <strong>Manager</strong> manages every account;{' '}
            <strong>Admin 1</strong> manages Admin 2, salespeople and Dubai Villas staff.
          </span>
        </div>
      )}

      {currentUser.role === 'ADMIN_1' && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-[var(--border)] text-xs text-slate-700">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#8b151b]" />
          <span>
            You manage Admin 2, salespeople and Dubai Villas staff. Manager and Admin 1 accounts,
            including your own, are changed by the Manager; change your own password from the
            account menu.
          </span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-pop-in"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="p-0.5 rounded text-emerald-700 hover:bg-emerald-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Department roster */}
      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/80 uppercase font-bold text-[11px] text-gray-500 tracking-wider">
                <th className="p-3">Person</th>
                <th className="p-3">Role</th>
                <th className="p-3">Access</th>
                <th className="p-3">Territory</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Edit</th>
                <th className="p-3 text-center">Deactivate</th>
                <th className="p-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {roster.map((u) => {
                const isSelf = u.id === currentUser.id;
                // Whether I may change this particular person at all.
                const editable = canManagePerson(currentUser, u);
                return (
                  <tr
                    key={u.id}
                    className={`align-top ${u.isActive ? 'hover:bg-gray-50' : 'bg-slate-50 text-slate-400'}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--red-100)] text-[var(--red-900)] font-semibold text-xs flex items-center justify-center">
                          {personInitial(u.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900">{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300 text-[9.5px] font-bold uppercase tracking-wide">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      {editable ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                          className="p-1 rounded border border-[var(--border-strong)] bg-white font-semibold text-[11px]"
                        >
                          {rolesICanGive.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${ROLE_BADGE[u.role]}`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-[11px] text-gray-600 max-w-[16rem]">
                      {ROLE_DESCRIPTIONS[u.role]}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {editable && u.role !== 'DUBAI_VILLAS' ? (
                        <select
                          value={u.region}
                          onChange={(e) => handleChangeRegion(u, e.target.value as Region | 'ALL')}
                          className="p-1 rounded border border-[var(--border-strong)] bg-white font-medium text-[11px]"
                        >
                          <option value="ABU_DHABI">Abu Dhabi</option>
                          <option value="DUBAI">Dubai</option>
                          <option value="ALL">All UAE</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {u.region === 'ALL'
                            ? 'All UAE'
                            : u.region === 'ABU_DHABI'
                            ? 'Abu Dhabi'
                            : 'Dubai'}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-gray-600 font-mono text-[11px]">{u.phone || '—'}</td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {editable && u.isActive && tenderRepository.usesDefaultPassword(u) && (
                        <div
                          className="mt-1 text-[10px] font-semibold text-amber-700 whitespace-nowrap"
                          title="Still signs in with the starting password. Set one of their own with Edit."
                        >
                          Default password
                        </div>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {canEditPeople && !editable && (
                        <span
                          className="inline-flex p-1.5 text-slate-300"
                          title="Only the Manager can change Manager and Admin 1 accounts."
                          aria-label="Only the Manager can change this account"
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      )}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          title="Edit person"
                          aria-label={`Edit ${u.name}`}
                          className={ICON_BTN + ' text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? `Deactivate ${u.name}` : `Reactivate ${u.name}`}
                            aria-label={u.isActive ? `Deactivate ${u.name}` : `Reactivate ${u.name}`}
                            className={
                              ICON_BTN +
                              (u.isActive
                                ? ' text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : ' text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50')
                            }
                          >
                            {u.isActive ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </button>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            title={`Remove ${u.name}`}
                            aria-label={`Remove ${u.name}`}
                            className={ICON_BTN + ' text-rose-500 hover:text-rose-700 hover:bg-rose-50'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access structure reference */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4 space-y-3 shadow-card">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-[#8b151b]" />
          <span>Access Structure</span>
        </div>
        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLE_ORDER.map((r) => (
            <div key={r} className={`rounded-md border p-3 ${ROLE_BADGE[r]}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">{ROLE_LABELS[r]}</div>
              <p className="text-[11px] mt-1 leading-snug">{ROLE_DESCRIPTIONS[r]}</p>
              <div className="text-[10px] mt-2 font-medium">
                {roster
                  .filter((u) => u.role === r && u.isActive)
                  .map((u) => u.name)
                  .join(', ') || 'No one assigned'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Person Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4 animate-pop-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editing ? `Edit ${editing.name}` : 'Add Person to Tendering Department'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2 rounded-md bg-red-50 border border-red-300 text-[11px] text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Engr. Tariq Mahmoud"
                  className="w-full p-2 rounded-md border border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Company Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tariq@inspire.ae"
                  className="w-full p-2 rounded-md border border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+971 50 123 4567"
                  className="w-full p-2 rounded-md border border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label
                  htmlFor="person-password"
                  className="block text-[11px] font-semibold text-gray-700 mb-1"
                >
                  {editing ? 'Password' : 'Password *'}
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="person-password"
                    type={showPassword ? 'text' : 'password'}
                    required={!editing}
                    autoComplete="new-password"
                    ref={passwordRef}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (e.target.value.trim().length >= MIN_PASSWORD_LENGTH) setPasswordError(false);
                    }}
                    aria-invalid={passwordError}
                    aria-describedby="person-password-rule"
                    placeholder={
                      editing ? 'Blank keeps the current password' : `At least ${MIN_PASSWORD_LENGTH} characters`
                    }
                    className={`w-full p-2 pl-7 pr-9 rounded-md border ${
                      passwordError ? 'border-red-500 bg-red-50/40' : 'border-[var(--border-strong)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {(() => {
                  const length = form.password.trim().length;
                  const ok = length >= MIN_PASSWORD_LENGTH;
                  // On an edit, the current password (or a blank field) is kept, so there is nothing to check.
                  const idle = !!editing && (form.password === '' || form.password === originalPassword);
                  const tone = idle
                    ? 'text-gray-500'
                    : ok
                    ? 'text-emerald-700'
                    : passwordError
                    ? 'text-red-700 font-semibold'
                    : 'text-gray-500';
                  const Icon = idle ? null : ok ? Check : passwordError ? CircleAlert : null;
                  return (
                    <p
                      id="person-password-rule"
                      role={passwordError ? 'alert' : undefined}
                      className={`mt-1.5 flex items-center gap-1.5 text-[11px] transition-colors ${tone}`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                      <span>
                        {idle
                          ? originalPassword === DEFAULT_PASSWORD
                            ? 'Current password: the shared starting password. Type a new one to give them their own.'
                            : 'Current password, unchanged. Type a new one to replace it.'
                          : passwordError && !ok
                          ? `Too short — use at least ${MIN_PASSWORD_LENGTH} characters, for example Inspire2026.`
                          : `New password: at least ${MIN_PASSWORD_LENGTH} characters`}
                      </span>
                      {!idle && (
                        <span className="ml-auto font-mono tabular-nums">
                          {Math.min(length, 99)}/{MIN_PASSWORD_LENGTH}
                        </span>
                      )}
                    </p>
                  );
                })()}
                <p className="mt-1 text-[10.5px] text-gray-500 leading-snug">
                  {editing
                    ? 'Use the eye to see it. A new password takes effect when you save.'
                    : 'They sign in with the email above and this password, and can change it from their account menu.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="w-full p-2 rounded-md border border-[var(--border-strong)] bg-white"
                  >
                    {rolesICanGive.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Territory
                  </label>
                  <select
                    value={form.role === 'DUBAI_VILLAS' ? 'DUBAI' : form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value as Region | 'ALL' })}
                    disabled={form.role === 'DUBAI_VILLAS'}
                    className="w-full p-2 rounded-md border border-[var(--border-strong)] bg-white disabled:bg-gray-100"
                  >
                    <option value="ABU_DHABI">Abu Dhabi</option>
                    <option value="DUBAI">Dubai</option>
                    <option value="ALL">All UAE</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-snug">
                {ROLE_DESCRIPTIONS[form.role]}
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer shadow-sm"
                >
                  {editing ? 'Save Changes' : 'Create Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
