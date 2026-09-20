/**
 * @file TabNavigation
 * View mode selector between Overview, Plan & DSL, Critique & Memory, and Interactive Studio.
 */

import React from 'react';

export type TabMode = 'overview' | 'document' | 'graphics' | 'plan' | 'critique' | 'studio' | 'tests';

interface TabNavigationProps {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabMode; label: string }[] = [
    { id: 'overview', label: 'OVERVIEW & INPUTS' },
    { id: 'document', label: 'DOCUMENT DOM & LAYERS' },
    { id: 'graphics', label: 'GRAPHICS ENGINE & 18 TOOLS' },
    { id: 'plan', label: 'PLAN • DSL • OPERATIONS' },
    { id: 'critique', label: 'CRITIQUE • ISSUES • MEMORY' },
    { id: 'studio', label: 'LIVE STUDIO CANVAS' },
    { id: 'tests', label: '7-PILLAR VERIFICATION SUITE' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="px-4 py-2 rounded-full text-[11px] mono font-medium border transition-all cursor-pointer"
          style={{
            background: activeTab === tab.id ? '#7c3aed' : '#111111',
            borderColor: activeTab === tab.id ? '#7c3aed' : '#222222',
            color: activeTab === tab.id ? 'white' : '#737373',
            boxShadow: activeTab === tab.id ? '0 0 16px rgba(124, 58, 237, 0.3)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
