import Link from 'next/link';
import React from 'react';

/** Replaces the stock black-and-white Next.js 404 with a way back into the app. */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 block h-[3px] w-10 bg-[#8b151b]" />
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Error 404
        </div>
        <h1 className="mt-3 text-[28px] font-bold tracking-tight text-slate-900">
          This page does not exist
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
          The link may be out of date, or the record may have been removed from the register.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-[#8b151b] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to dashboard
          </Link>
          <Link
            href="/tenders"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Tenders pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
