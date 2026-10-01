'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Renders a long list a page at a time. The follow-up worklist and the
 * monitoring board drew every row at once, hundreds of them, which made the
 * page slow to open and a very long scroll to the end.
 *
 * `resetKey` is anything that changes when the list does (a tab, a filter);
 * the list goes back to its first page when it changes.
 */
export function useShowMore<T>(items: T[], resetKey: unknown, step = 25) {
  const [limit, setLimit] = useState(step);
  const [lastKey, setLastKey] = useState(resetKey);

  // Adjusting state during render is React's way to reset on a prop change
  // without an effect and the extra paint that comes with one.
  let current = limit;
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setLimit(step);
    current = step;
  }

  return {
    visible: items.slice(0, current),
    shown: Math.min(current, items.length),
    total: items.length,
    hasMore: items.length > current,
    showMore: () => setLimit((l) => l + step),
    showAll: () => setLimit(items.length),
    step,
  };
}

interface ShowMoreFooterProps {
  shown: number;
  total: number;
  step: number;
  onMore: () => void;
  onAll: () => void;
  /** What the rows are, for the count line: "tenders", "follow-ups". */
  noun?: string;
}

export const ShowMoreFooter: React.FC<ShowMoreFooterProps> = ({
  shown,
  total,
  step,
  onMore,
  onAll,
  noun = 'items',
}) => {
  if (total <= shown) return null;
  const next = Math.min(step, total - shown);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 px-4 py-3 text-xs">
      <span className="text-slate-500">
        Showing <span className="font-mono font-semibold text-slate-800">{shown}</span> of{' '}
        <span className="font-mono font-semibold text-slate-800">{total}</span> {noun}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMore}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Show {next} more
        </button>
        <button
          type="button"
          onClick={onAll}
          className="px-3 py-1.5 rounded-md font-semibold text-[#8b151b] hover:bg-[var(--red-50)] transition-colors cursor-pointer"
        >
          Show all
        </button>
      </div>
    </div>
  );
};
