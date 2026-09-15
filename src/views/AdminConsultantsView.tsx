'use client';

import React, { useState } from 'react';
import { Building, PlusCircle, Phone, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { can } from '../lib/permissions';
import { AccessDenied } from '../components/ui/AccessDenied';

export const AdminConsultantsView: React.FC = () => {
  const { currentUser, dataVersion, refreshData } = useAuth();
  const allowed = can(currentUser, 'manage_admin');
  const consultants = tenderRepository.getConsultants();

  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [engineerName, setEngineerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  const handleAddConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    tenderRepository.createConsultant({
      companyName: companyName.trim(),
      engineerName: engineerName.trim() || null,
      contactNumber: contactNumber.trim() || null,
      email: email.trim().toLowerCase() || null,
    });

    setCompanyName('');
    setEngineerName('');
    setContactNumber('');
    setEmail('');
    setShowModal(false);
    refreshData();
  };

  if (!allowed) return <AccessDenied requirement="Only the Manager, Admin 1 and Admin 2 administer the Tendering Department." />;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Consultant Engineering Directory
          </h1>
          <p className="text-xs text-slate-500">
            Supervising consultants on file, with contacts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Consultant</span>
        </button>
      </div>

      <div className="bg-white rounded-md border border-[var(--border)] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 bg-gray-50 uppercase font-bold text-[11px] text-gray-500 tracking-wider">
              <th className="p-3">Consultant Company</th>
              <th className="p-3">Lead Project Engineer</th>
              <th className="p-3">Contact Phone</th>
              <th className="p-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {consultants.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-900">{c.companyName}</td>
                <td className="p-3 text-gray-700">{c.engineerName || '—'}</td>
                <td className="p-3 font-mono text-gray-600">
                  {c.contactNumber ? (
                    <a
                      href={`tel:${c.contactNumber}`}
                      className="text-[var(--red-700)] hover:underline"
                    >
                      {c.contactNumber}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-gray-600">{c.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-md shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add Engineering Consultant</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddConsultant} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Consultancy Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Diar Consultants"
                  className="w-full p-2 rounded-md border border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Lead Engineer / Contact Person
                </label>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  placeholder="e.g. Engr. Bassem"
                  className="w-full p-2 rounded-md border border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="050-XXXXXXX"
                    className="w-full p-2 rounded-md border border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@consultant.ae"
                    className="w-full p-2 rounded-md border border-slate-400"
                  />
                </div>
              </div>

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
                  className="px-4 py-1.5 rounded-md text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer"
                >
                  Save Consultant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
