'use client';

import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { tenderRepository, MIN_PASSWORD_LENGTH } from '../../lib/repositories/tenderRepository';
import { useModalDismiss } from '../../lib/useModalDismiss';
import { User } from '../../types';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
}

/** Lets the signed-in person replace their own password. */
export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setShow(false);
    setError(null);
    setDone(false);
    onClose();
  };

  useModalDismiss(isOpen, close);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    try {
      tenderRepository.changePassword(user, current, next);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 rounded-md border border-slate-400"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="bg-white rounded-md shadow-2xl border border-[var(--border)] max-w-sm w-full p-5 space-y-4 text-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 id="change-password-title" className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#8b151b]" />
            Change Password
          </h3>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Password changed. Next time, sign in as <strong>{user.email}</strong> with the new
                password.
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="px-4 py-1.5 rounded-md text-white font-semibold bg-[#8b151b] hover:bg-[#731217] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {error && (
              <div
                role="alert"
                className="p-2 rounded-md bg-red-50 border border-red-300 text-[11px] text-red-800"
              >
                {error}
              </div>
            )}

            {field('pw-current', 'Current Password', current, setCurrent, 'current-password')}
            {field('pw-next', 'New Password', next, setNext, 'new-password')}
            {field('pw-confirm', 'Confirm New Password', confirm, setConfirm, 'new-password')}

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>At least {MIN_PASSWORD_LENGTH} characters.</span>
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="flex items-center gap-1 hover:text-gray-800 cursor-pointer"
              >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={close}
                className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md text-white font-semibold bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer"
              >
                Change Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
