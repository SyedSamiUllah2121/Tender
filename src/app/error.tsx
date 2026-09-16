'use client';

import Link from 'next/link';
import React, {useEffect} from 'react';

/**
 * Catches anything a screen throws so a single bad record cannot leave the
 * person staring at a blank page with no way out.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & {digest?: string};
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 block h-[3px] w-10 bg-[#8b151b]" />
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Unexpected error
        </div>
        <h1 className="mt-3 text-[28px] font-bold tracking-tight text-slate-900">
          This screen could not be loaded
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
          Nothing was saved or changed. Try again, and if it keeps happening, note what you were
          doing and report it to Admin 1.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-slate-400">Reference: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="cursor-pointer rounded-md bg-[#8b151b] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
