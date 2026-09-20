/**
 * @file KpiCards
 * Metric and status cards for quick benchmark insights.
 */

import React from 'react';

export interface KpiItem {
  label: string;
  value: string;
  sub: string;
  color: string;
}

interface KpiCardsProps {
  items?: KpiItem[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ items }) => {
  const defaultItems: KpiItem[] = [
    { label: 'BEST SCORE', value: '0.815', sub: 'semantic 1.0', color: '#a78bfa' },
    { label: 'TOOLS USED', value: '11', sub: '4 vision • 7 primitive', color: '#e5e5e5' },
    { label: 'TOTAL TIME', value: '278.0ms', sub: '11 ops executed', color: '#e5e5e5' },
    { label: 'ITERATIONS', value: '2', sub: '1 rollback', color: '#f59e0b' },
    { label: 'CONFIDENCE', value: '0.90', sub: 'intent • 0.89 constraints', color: '#10b981' },
    { label: 'STATUS', value: 'NEEDS REVISION', sub: 'severity high', color: '#f59e0b' },
  ];

  const displayList = items || defaultItems;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
      {displayList.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border p-4 transition-all hover:border-[#333]"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[10px] tracking-widest mb-2 text-[#737373]">
            {item.label}
          </div>
          <div className="text-[20px] font-bold tracking-tight mono" style={{ color: item.color }}>
            {item.value}
          </div>
          <div className="text-[11px] mono mt-1 text-[#737373]">
            {item.sub}
          </div>
        </div>
      ))}
    </div>
  );
};
