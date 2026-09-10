'use client';

import React, { useState } from 'react';
import { Users, Shield, PlusCircle, Check, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { User, Role, Region } from '../types';

export const AdminUsersView: React.FC = () => {
  const { currentUser, allUsers, refreshData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [region, setRegion] = useState<Region | 'ALL'>('ABU_DHABI');
  const [phone, setPhone] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    tenderRepository.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      region,
      phone: phone.trim() || null,
      isActive: true,
    });

    setName('');
    setEmail('');
    setPhone('');
    setShowAddModal(false);
    refreshData();
  };

  const handleToggleActive = (user: User) => {
    tenderRepository.updateUser(user.id, { isActive: !user.isActive });
    refreshData();
  };

  const handleChangeRole = (user: User, newRole: Role) => {
    tenderRepository.updateUser(user.id, { role: newRole });
    refreshData();
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            User Administration & Role Assignments
          </h1>
          <p className="text-xs text-slate-500">
            Manage system access, strict role permissions, and regional territory scoping
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 uppercase font-bold text-[11px] text-gray-500 tracking-wider">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Territory</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--red-100)] text-[var(--red-900)] font-black text-xs flex items-center justify-center">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    {currentUser.role === 'SUPER_ADMIN' ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                        className="p-1 rounded border border-gray-300 bg-white font-semibold text-[11px]"
                      >
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="USER">SALESPERSON (USER)</option>
                        <option value="VIEWER">AUDITOR (VIEWER)</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-gray-700">{u.role}</span>
                    )}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-[11px]">
                      {u.region === 'ALL'
                        ? 'All UAE'
                        : u.region === 'ABU_DHABI'
                        ? 'Abu Dhabi'
                        : 'Dubai'}
                    </span>
                  </td>

                  <td className="p-3 text-gray-600 font-mono text-[11px]">
                    {u.phone || '—'}
                  </td>

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
                  </td>

                  <td className="p-3 text-right">
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className="text-[11px] font-semibold text-gray-600 hover:text-[var(--red-700)] cursor-pointer"
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add New Team Member</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mahmoud"
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Company Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tariq@inspire.ae"
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full p-2 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="USER">Salesperson (Scoped)</option>
                    <option value="MANAGER">Sales Manager</option>
                    <option value="ADMIN">Commercial Admin</option>
                    <option value="SUPER_ADMIN">Executive (Super Admin)</option>
                    <option value="VIEWER">Read-Only Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Territory
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region | 'ALL')}
                    className="w-full p-2 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="ABU_DHABI">Abu Dhabi</option>
                    <option value="DUBAI">Dubai</option>
                    <option value="ALL">All UAE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
