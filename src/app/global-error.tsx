'use client';

import React from 'react';

/** Last resort: the root layout itself failed, so this supplies its own document. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & {digest?: string};
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{maxWidth: '420px', textAlign: 'center'}}>
          <div
            style={{
              width: '40px',
              height: '3px',
              background: '#8b151b',
              margin: '0 auto 24px',
            }}
          />
          <h1 style={{fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em'}}>
            The application could not start
          </h1>
          <p style={{marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#64748b'}}>
            Reload the page. If this keeps happening, report it to Admin 1.
          </p>
          {error.digest && (
            <p style={{marginTop: '12px', fontSize: '11px', color: '#94a3b8'}}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: '28px',
              cursor: 'pointer',
              border: 0,
              borderRadius: '6px',
              background: '#8b151b',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              padding: '11px 18px',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
