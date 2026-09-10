'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileSpreadsheet, Trophy, CalendarClock, PlusCircle, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tenderRepository } from '../../lib/repositories/tenderRepository';
import { formatAED } from '../../lib/money';
import { StatusBadge } from '../ui/StatusBadge';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tenders = tenderRepository.getTenders(currentUser);
  const q = query.trim().toLowerCase();

  const filteredTenders = q
    ? tenders
        .filter(
          (t) =>
            t.tenderNumber.toString().includes(q) ||
            t.clientNameRaw.toLowerCase().includes(q) ||
            t.location.toLowerCase().includes(q) ||
            (t.award?.projectNumber && t.award.projectNumber.toString().includes(q))
        )
        .slice(0, 6)
    : tenders.slice(0, 4);

  const quickActions = [
    { label: 'Create New Tender', path: '/tenders/new', icon: PlusCircle, isPrimary: true },
    { label: 'View Tenders Pipeline', path: '/tenders', icon: FileSpreadsheet, isPrimary: false },
    { label: 'View Awarded Projects', path: '/awarded', icon: Trophy, isPrimary: false },
    { label: 'Follow-ups Worklist', path: '/followups', icon: CalendarClock, isPrimary: false },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in-50 duration-100">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenders, clients, locations, or projects..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
                Quick Navigation
              </div>
              <div className="space-y-0.5">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.path}
                      type="button"
                      onClick={() => {
                        router.push(act.path);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        act.isPrimary
                          ? 'text-[#8b151b] hover:bg-[#8b151b]/8 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${act.isPrimary ? 'text-[#8b151b]' : 'text-slate-500'}`} />
                        <span>{act.label}</span>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 ${act.isPrimary ? 'text-[#8b151b]' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tenders matches */}
          <div className="py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Tenders {q ? `(${filteredTenders.length} matches)` : '(Recent)'}
            </div>
            {filteredTenders.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching tenders found for "{query}".
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTenders.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      router.push(`/tenders/${t.id}`);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-slate-900">
                          #{t.tenderNumber}
                        </span>
                        {t.award?.projectNumber && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60">
                            PJ/{t.award.projectNumber}
                          </span>
                        )}
                        <span className="font-medium text-xs text-slate-800 truncate">
                          {t.clientNameRaw}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{t.location}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-600 font-medium">{formatAED(t.tenderAmount)}</span>
                      </div>
                    </div>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
          <span>Navigate with click</span>
          <span className="font-mono text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
