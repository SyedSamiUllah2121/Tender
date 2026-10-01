'use client';

import React from 'react';
import { motion } from 'motion/react';

/**
 * The bar under the selected tab. Render it inside the active tab only, with
 * the same `group` for every tab in a row, and it slides from the old tab to
 * the new one. The tab itself needs `relative`.
 */
export const TabUnderline: React.FC<{ group: string; className?: string }> = ({
  group,
  className = 'bg-[#8b151b]',
}) => (
  <motion.span
    layoutId={`tab-underline-${group}`}
    aria-hidden="true"
    className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full ${className}`}
    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
  />
);
