'use client';

import React, { useState } from 'react';
import { Tag, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { SourceKind } from '../types';

export const AdminSourcesView: React.FC = () => {
  const { currentUser, dataVersion, refreshData } = useAuth();
  const sources = tenderRepository.getSources();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SourceKind>('INTERNAL_SALES');
  const [commissionRate, setCommissionRate] = useState('');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    tenderRepository.createSource({
      name: name.trim(),
      kind,
      commissionRate: commissionRate.trim() || null,
      isActive: true,
    });

    setName('');
    setCommissionRate('');
    setShowModal(false);
    refreshData();
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lead Source Registry & Commission Models
          </h1>
          <p className="text-xs text-slate-500">
            Manage commercial attribution channels, external broker partnerships, and commission structures
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8b151b] hover:bg-[#731217] shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Lead Source</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 uppercase font-bold text-[11px] text-gray-500 tracking-wider">
              <th className="p-3">Source Name</th>
              <th className="p-3">Channel Kind</th>
              <th className="p-3">Default Commission Model</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-900">{s.name}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[11px]">
                    {s.kind.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-3 font-mono text-emerald-800 font-bold">
                  {s.commissionRate || '—'}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[var(--border)] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add Lead Source</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSource} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Source / Salesperson Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Al Wasl Property Brokerage"
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Channel Category *
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as SourceKind)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white font-medium"
                >
                  <option value="INTERNAL_SALES">Internal Sales Executive</option>
                  <option value="BROKER">External Real Estate Broker</option>
                  <option value="CLIENT_DIRECT">Client Direct / Word of Mouth</option>
                  <option value="MANAGEMENT">Executive Management Lead</option>
                  <option value="EXHIBITION">Cityscape / Trade Exhibition</option>
                  <option value="OTHER">Other Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Default Commission Structure Note
                </label>
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="e.g. 2% upon advance payment or 4%+2%"
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer shadow-xs"
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
