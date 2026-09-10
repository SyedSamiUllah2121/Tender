'use client';

import React from 'react';
import { TenderStatus } from '../../types';

interface StatusBadgeProps {
  status: TenderStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const configs: Record<
    TenderStatus,
    { label: string; dot: string; text: string; bg: string; border: string }
  > = {
    AWARDED: {
      label: 'Awarded',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/70',
    },
    REJECTED: {
      label: 'Rejected',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200/70',
    },
    SUBMITTED: {
      label: 'Submitted',
      dot: 'bg-blue-500',
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200/70',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      dot: 'bg-amber-500',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200/70',
    },
    ON_HOLD: {
      label: 'On Hold',
      dot: 'bg-purple-500',
      text: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200/70',
    },
    DRAFT: {
      label: 'Draft',
      dot: 'bg-teal-500',
      text: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200/70',
    },
    CANCELLED: {
      label: 'Cancelled',
      dot: 'bg-slate-400',
      text: 'text-slate-600',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
  };

  const config = configs[status] || configs.DRAFT;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-[12px] px-2.5 py-0.5 gap-1.5 font-medium',
    lg: 'text-[13px] px-3 py-1 gap-2 font-semibold',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap select-none transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${className}`}
    >
      <span className={`rounded-full shrink-0 ${config.dot} ${dotSizes[size]}`} />
      <span>{config.label}</span>
    </span>
  );
};
