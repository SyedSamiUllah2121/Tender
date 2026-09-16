'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Lock,
  LoaderCircle,
  Mail,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

const RED = '#8b151b';

interface LoginViewProps {
  /** Returns an error message, or null when the sign-in succeeded. */
  onSignIn: (email: string, password: string) => string | null;
}

/**
 * The logo is 930x260. In a flex column the default `align-items: stretch`
 * would pull an <img> to the full panel width and squash it, so it is given an
 * explicit width and `self-start` and is never allowed to stretch.
 */
const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/logo.png"
    alt="Inspire Builders"
    width={930}
    height={260}
    className={`block h-auto w-[210px] max-w-full self-start shrink-0 ${className}`}
  />
);

const FACTS = [
  { icon: CalendarDays, label: 'Follow-up window', value: '2 months' },
  { icon: MapPin, label: 'Regions', value: 'Abu Dhabi, Dubai' },
  { icon: ShieldCheck, label: 'Access', value: 'Role based' },
];

export const LoginView: React.FC<LoginViewProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
    Gate the optional photograph on it actually loading, rather than rendering
    it and hiding on error: nothing appears unless the file is really there.
  */
  const [photoOk, setPhotoOk] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const message = onSignIn(email, password);
    if (message) {
      setError(message);
      setBusy(false);
    }
    // On success the provider swaps this screen out, so nothing to reset.
  };

  return (
    <div className="h-screen overflow-hidden grid lg:grid-cols-[1.2fr_1fr] bg-white">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#e8eff4]">
        {/* Probe: only swaps in the photo once it has genuinely loaded */}
        <img
          src="/login-photo.jpg"
          alt=""
          aria-hidden="true"
          onLoad={() => setPhotoOk(true)}
          className="hidden"
        />

        {!photoOk && (
          <img
            src="/login-haze-v2.svg"
            alt=""
            aria-hidden="true"
            width={1000}
            height={900}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left-bottom"
          />
        )}

        {/*
          Softens the background under the copy column. Anchoring left-bottom
          fixes which part of the artwork lands there, but the scale still
          varies with panel width, so this guarantees the margin.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#eef3f7] from-18% to-transparent to-70%"
        />

        {photoOk && (
          <>
            <img
              src="/login-photo.jpg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            {/* Keeps the copy readable over a photograph */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white from-30% to-white/25"
            />
          </>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_80%_at_100%_0%,rgba(139,21,27,0.55)_0%,rgba(139,21,27,0.26)_32%,rgba(139,21,27,0)_65%)]"
        />

        <div className="relative shrink-0 px-16 pt-12">
          <Logo />

          <div className="mt-14 max-w-lg">
            <h1 className="text-[44px] font-bold leading-[1.08] tracking-tight text-slate-900">
              Tendering
              <br />
              <span style={{ color: RED }}>Department</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600">
              Tender records, follow-ups and awards for Abu Dhabi and Dubai. Every tender stays
              engaged until it is awarded, rejected, or confirmed still under process.
            </p>

            <dl className="mt-10 flex flex-wrap items-stretch">
              {FACTS.map(({ icon: Icon, label, value }, i) => (
                <div
                  key={label}
                  className={`pr-10 ${i > 0 ? 'border-l border-slate-300 pl-10' : ''}`}
                >
                  <Icon className="h-5 w-5" style={{ color: RED }} strokeWidth={1.75} />
                  <dt className="mt-3 text-[13px] text-slate-600">{label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>


        <div className="relative mt-auto flex items-center gap-3 px-16 pb-8 pt-6">
          <span className="block h-[2px] w-8 shrink-0" style={{ backgroundColor: RED }} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
            Inspire Builders General Contracting
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center overflow-y-auto bg-[#fafbfc] px-6 py-10 sm:px-14">
        <div className="w-full max-w-[380px]">
          {/* The brand panel is hidden on small screens, so the mark repeats here */}
          <div className="lg:hidden mb-10">
            <Logo className="w-[170px]" />
          </div>

          <span className="mb-6 block h-[3px] w-10" style={{ backgroundColor: RED }} />

          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">Use your Inspire Builders email address.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  required
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@inspire.ae"
                  className="w-full rounded-md border border-slate-300 bg-white py-3 pl-11 pr-3.5 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-[#8b151b]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-slate-300 bg-white py-3 pl-11 pr-11 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-[#8b151b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{ backgroundColor: RED }}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-md px-4 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-[18px] w-[18px]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-slate-300" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Secure login
            </span>
            <span className="h-px flex-1 bg-slate-300" />
          </div>

          <div className="mt-6 flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
            <p className="text-[13px] leading-relaxed text-slate-500">
              Accounts are created by the Manager or Admin 1 under Team &amp; Permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
