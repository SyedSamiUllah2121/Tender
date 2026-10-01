'use client';

import React from 'react';

/*
  One look and one motion for every chart. Recharts' defaults are a 1.5s
  linear animation, a grey hover block and a bare tooltip, which each chart
  then restyled on its own. Shared here, the charts match each other and the
  rest of the app, and they ease in quickly instead of crawling.
*/

export const CHART_COLORS = {
  brand: '#8b151b',
  awarded: '#10b981',
  rejected: '#f43f5e',
  pipeline: '#3b82f6',
  amber: '#f59e0b',
  ink: '#0f172a',
  axis: '#64748b',
  grid: '#eef2f6',
  line: '#e2e8f0',
};

/** Spread onto any Bar, Area, Line, Pie or Scatter. */
export const SMOOTH = {
  isAnimationActive: true,
  animationDuration: 650,
  animationEasing: 'ease-out' as const,
};

export const axisProps = {
  tick: { fontSize: 11, fill: CHART_COLORS.axis },
  axisLine: { stroke: CHART_COLORS.line },
  tickLine: false,
  tickMargin: 6,
};

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
};

/** Hover highlight behind a bar group: a light wash instead of grey. */
export const barCursor = { fill: 'rgba(139, 21, 27, 0.05)' };

/** Hover line for area and scatter charts. */
export const lineCursor = { stroke: '#cbd5e1', strokeDasharray: '3 3' };

/* Recharts sorts legend and tooltip rows alphabetically by default, which put
   Awarded ahead of Received. Both keep the order the series are drawn in. */
export const legendProps = {
  itemSorter: null,
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: '11px', paddingTop: '8px' },
};

export const TOOLTIP_ORDER = { itemSorter: () => 0 };

/** Charts hold off re-measuring while a window or the nav drawer resizes. */
export const RESIZE_DEBOUNCE = 120;

/** 1,250 -> "1.3k", 12,000 -> "12k". */
export const compactNumber = (n: number): string =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 || Math.abs(n) >= 10000 ? 0 : 1)}k` : `${n}`;

interface TooltipRow {
  name?: React.ReactNode;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: any;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: React.ReactNode;
  payload?: TooltipRow[];
  /** Formats each value; the default prints the number with separators. */
  formatValue?: (value: number | string, row: TooltipRow) => React.ReactNode;
  /** Extra line under the rows, given the hovered datum. */
  footer?: (datum: any) => React.ReactNode;
  /** Adds a total line when a chart stacks several series. */
  showTotal?: boolean;
}

/** The app's card style, used as `content` on every Recharts Tooltip. */
export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  label,
  payload,
  formatValue,
  footer,
  showTotal,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((r) => r.value !== undefined && r.value !== null);
  const total = rows.reduce((sum, r) => sum + (typeof r.value === 'number' ? r.value : 0), 0);
  const fmt = (v: number | string, r: TooltipRow) =>
    formatValue ? formatValue(v, r) : typeof v === 'number' ? v.toLocaleString() : v;
22
  return (
    <div className="min-w-[9rem] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {label !== undefined && label !== '' && (
        <div className="mb-1.5 font-semibold text-slate-900">{label}</div>
      )}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={String(r.dataKey ?? r.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              {r.name}
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {fmt(r.value as number | string, r)}
            </span>
          </div>
        ))}
      </div>
      {showTotal && rows.length > 1 && (
        <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 text-slate-500">
          <span>Total</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {total.toLocaleString()}
          </span>
        </div>
      )}
      {footer && rows[0]?.payload && (
        <div className="mt-1.5 border-t border-slate-200 pt-1.5 text-slate-500">
          {footer(rows[0].payload)}
        </div>
      )}
    </div>
  );
};

/**
 * Category tick that truncates long names, with the full name on hover.
 * Long location and consultant names otherwise run into each other.
 */
export const TruncatedTick: React.FC<any> = ({ x, y, payload, maxChars = 14, textAnchor = 'end', dy = 4 }) => {
  const full = String(payload?.value ?? '');
  const text = full.length > maxChars ? `${full.slice(0, maxChars - 1)}…` : full;
  return (
    <text x={x} y={y} dy={dy} textAnchor={textAnchor} fontSize={11} fill={CHART_COLORS.axis}>
      <title>{full}</title>
      {text}
    </text>
  );
};

/**
 * Scatter point that pops in with a CSS animation, sweeping left to right.
 * Recharts animates each point in JavaScript, which stutters with hundreds of
 * points; a CSS animation per circle runs off the main thread's critical path
 * and holds up at 700+. Use as `shape={popDot(color, opacity)}` with the
 * Scatter's own animation turned off.
 */
export const popDot = (fill: string, fillOpacity: number, radius = 3.2) => {
  const Dot = (props: { cx?: number; cy?: number }) => {
    const { cx, cy } = props;
    if (cx === undefined || cy === undefined) return <g />;
    // Left to right across roughly the chart's width, done within 0.6s.
    const delay = Math.round(Math.min(1, Math.max(0, cx / 1200)) * 600);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        fillOpacity={fillOpacity}
        className="scatter-dot"
        style={{ animationDelay: `${delay}ms` }}
      />
    );
  };
  return Dot;
};

/** Vertical gradient for an Area fill, referenced as url(#id). */
export const AreaGradient: React.FC<{ id: string; color: string }> = ({ id, color }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
  </linearGradient>
);

/**
 * Holds a chart back for a few frames so the page around it paints first.
 * Building every chart in the same frame as the page made opening the
 * dashboard one long freeze; `order` spreads the charts over successive
 * frames, with a shimmer placeholder until each one is ready.
 */
export const DeferredChart: React.FC<{ order?: number; children: React.ReactNode }> = ({
  order = 0,
  children,
}) => {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let frame = 0;
    let left = order + 2;
    const step = () => {
      if (--left <= 0) setReady(true);
      else frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [order]);
  return ready ? <>{children}</> : <div className="skeleton h-full w-full" aria-hidden="true" />;
};

/** Shown in place of a chart that has nothing to plot. */
export const ChartEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex h-full items-center justify-center text-xs text-slate-400">{message}</div>
);
