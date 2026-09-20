/**
 * @file MemoryExplorer.tsx
 * Full-featured interactive Memory System UI for Maestro.
 * Supports:
 * - 6 Memory Types (Project, Operation, User Preference, Visual Decision, Failure, Successful Workflow)
 * - Persistent (LocalStorage / Memory)
 * - Queryable (Live Keyword Search, Type Filter, Confidence Threshold)
 * - Inspectable (Full JSON Data, Metadata, Utility Score, Timestamps)
 * - Editable (In-place modifications with persistent sync)
 * - Deletable (Single item delete, typed clear)
 * - Clear distinction from Document History
 */

import React, { useState, useMemo } from 'react';
import {
  Brain,
  Search,
  Trash2,
  Edit3,
  Eye,
  Plus,
  Download,
  Upload,
  RefreshCw,
  AlertOctagon,
  Sparkles,
  Layers,
  Sliders,
  CheckCircle,
  X,
  History,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MemoryEngine } from '../memory/MemoryEngine';
import { BaseMemoryEntry, MemoryType, SuccessfulWorkflowMemoryData } from '../memory/types';

interface MemoryExplorerProps {
  memoryEngine: MemoryEngine;
  onMemoryChanged?: () => void;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  memoryEngine,
  onMemoryChanged,
}) => {
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [inspectingItem, setInspectingItem] = useState<BaseMemoryEntry | null>(null);
  const [editingItem, setEditingItem] = useState<BaseMemoryEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [version, setVersion] = useState<number>(0);

  // Force re-render on mutation
  const notifyChange = () => {
    setVersion((v) => v + 1);
    if (onMemoryChanged) onMemoryChanged();
  };

  // Memory Type metadata
  const typeConfig: Record<
    MemoryType,
    { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }
  > = {
    project: {
      label: 'Project Memory',
      icon: <Layers className="w-3.5 h-3.5" />,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.1)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    operation: {
      label: 'Operation Memory',
      icon: <Zap className="w-3.5 h-3.5" />,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    user_preference: {
      label: 'User Preference',
      icon: <Sliders className="w-3.5 h-3.5" />,
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    visual_decision: {
      label: 'Visual Decision',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.1)',
      borderColor: 'rgba(167, 139, 250, 0.3)',
    },
    failure: {
      label: 'Failure Memory',
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    successful_workflow: {
      label: 'Successful Workflow',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
  };

  // Queries items matching search and type
  const items = useMemo(() => {
    // depend on version to refresh
    void version;
    return memoryEngine.query({
      type: selectedType === 'all' ? undefined : selectedType,
      keyword: searchQuery.trim() || undefined,
      minConfidence: minConfidence > 0 ? minConfidence : undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  }, [memoryEngine, selectedType, searchQuery, minConfidence, version]);

  const stats = useMemo(() => {
    void version;
    return memoryEngine.getStats();
  }, [memoryEngine, version]);

  // Handle Delete
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this memory entry?')) {
      memoryEngine.delete(id);
      notifyChange();
      if (inspectingItem?.id === id) setInspectingItem(null);
      if (editingItem?.id === id) setEditingItem(null);
    }
  };

  // Handle Export
  const handleExport = () => {
    const json = memoryEngine.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maestro_memory_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Import
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const content = re.target?.result as string;
          const res = memoryEngine.importFromJSON(content);
          alert(`Successfully imported ${res.imported} memories! Total now: ${res.total}`);
          notifyChange();
        } catch (err: any) {
          alert(`Import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Strict Separation Architecture Banner */}
      <div
        className="p-5 rounded-2xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.95), rgba(24, 24, 27, 0.95))',
          borderColor: '#262626',
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ background: 'rgba(124, 58, 237, 0.15)', borderColor: 'rgba(124, 58, 237, 0.4)' }}
            >
              <Brain className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  AUTONOMOUS MEMORY SYSTEM
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] mono border text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30">
                  PERSISTENT & DECOUPLED
                </span>
              </div>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                Decoupled from History: History records <span className="text-white font-medium">what happened</span> (canvas snapshots), while Memory records <span className="text-white font-medium">what was learned</span> (recipes, anti-patterns, aesthetic choices).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3 py-1.5 rounded-lg text-xs mono border flex items-center gap-1.5 transition-colors cursor-pointer bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Memory
            </button>
            <button
              onClick={handleExport}
              title="Export Memories to JSON"
              className="p-1.5 rounded-lg border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleImport}
              title="Import Memories from JSON"
              className="p-1.5 rounded-lg border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#262626]">
          <div className="p-3 rounded-xl bg-[#0f0f10] border border-[#222225] flex items-start gap-2.5">
            <History className="w-4 h-4 text-[#71717a] mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mono font-medium text-[#71717a]">DOCUMENT HISTORY</div>
              <div className="text-[11px] text-[#a1a1aa] mt-0.5 leading-relaxed">
                Transient execution timeline. Rolling back reverts canvas DOM and layers to prior states.
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f0f10] border border-[#222225] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#a78bfa] mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mono font-medium text-[#a78bfa]">EXTRACTED EXPERIENCE MEMORY</div>
              <div className="text-[11px] text-[#a1a1aa] mt-0.5 leading-relaxed">
                Persistent across sessions. Rollbacks trigger Failure memories to prevent repeating mistakes!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {(Object.keys(typeConfig) as MemoryType[]).map((t) => {
          const cfg = typeConfig[t];
          const count = stats.byType[t] || 0;
          const isSelected = selectedType === t;

          return (
            <button
              key={t}
              onClick={() => setSelectedType(isSelected ? 'all' : t)}
              className="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
              style={{
                background: isSelected ? cfg.bgColor : '#111113',
                borderColor: isSelected ? cfg.borderColor : '#222225',
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="text-xs mono font-bold text-white">{count}</span>
              </div>
              <div className="text-[10px] mono tracking-wider mt-2 truncate" style={{ color: cfg.color }}>
                {cfg.label.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Query & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border border-[#222225] bg-[#111113]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Query memories by keyword, tags, tool, or parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181b] text-white text-xs pl-9 pr-4 py-2 rounded-lg border border-[#27272a] focus:outline-none focus:border-[#7c3aed]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#18181b] text-[11px] mono text-[#a1a1aa]">
            <span>Min Confidence:</span>
            <span className="text-white font-medium">{(minConfidence * 100).toFixed(0)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-16 accent-[#7c3aed] ml-1"
            />
          </div>

          {selectedType !== 'all' && (
            <button
              onClick={() => setSelectedType('all')}
              className="px-2.5 py-1.5 rounded-lg border border-[#27272a] bg-[#18181b] text-[11px] mono text-[#a1a1aa] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              Reset Type <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Memory Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-[#27272a] text-center text-[#71717a] mono text-xs">
            No memories match your query criteria.
          </div>
        ) : (
          items.map((item) => {
            const cfg = typeConfig[item.type];
            const isWorkflow = item.type === 'successful_workflow';
            const wfData = isWorkflow ? (item.data as SuccessfulWorkflowMemoryData) : null;

            return (
              <div
                key={item.id}
                onClick={() => setInspectingItem(item)}
                className="p-4 rounded-xl border transition-all cursor-pointer group hover:border-[#3f3f46]"
                style={{
                  background: '#111113',
                  borderColor: '#222225',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5"
                      style={{
                        background: cfg.bgColor,
                        borderColor: cfg.borderColor,
                        color: cfg.color,
                      }}
                    >
                      {cfg.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] mono px-2 py-0.5 rounded-full border font-medium"
                          style={{
                            color: cfg.color,
                            background: cfg.bgColor,
                            borderColor: cfg.borderColor,
                          }}
                        >
                          {cfg.label.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-medium text-white group-hover:text-[#a78bfa] transition-colors">
                          {item.title}
                        </h4>
                      </div>

                      <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Render workflow pipeline sequence if available */}
                      {isWorkflow && wfData && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {wfData.pipelineSequence.map((step, idx) => (
                            <React.Fragment key={idx}>
                              <span className="px-2 py-0.5 rounded text-[10px] mono bg-[#18181b] border border-[#27272a] text-white">
                                {step}
                              </span>
                              {idx < wfData.pipelineSequence.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-[#71717a]" />
                              )}
                            </React.Fragment>
                          ))}
                          <span className="text-[10px] mono text-[#10b981] ml-2">
                            Score: {wfData.finalQualityScore.toFixed(3)}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] mono px-2 py-0.5 rounded-full bg-[#18181b] text-[#71717a] border border-[#222225]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right mono text-[10px]">
                      <div className="text-white font-medium">
                        {(item.confidence * 100).toFixed(0)}% conf
                      </div>
                      <div className="text-[#71717a]">
                        {new Date(item.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingItem(item);
                        }}
                        className="p-1.5 rounded-md hover:bg-[#222225] text-[#71717a] hover:text-white transition-colors"
                        title="Inspect Full Memory"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="p-1.5 rounded-md hover:bg-[#222225] text-[#71717a] hover:text-[#a78bfa] transition-colors"
                        title="Edit Memory"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-md hover:bg-[#222225] text-[#71717a] hover:text-[#ef4444] transition-colors"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INSPECT MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#111113] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222225] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] mono border font-medium"
                  style={{
                    color: typeConfig[inspectingItem.type].color,
                    background: typeConfig[inspectingItem.type].bgColor,
                    borderColor: typeConfig[inspectingItem.type].borderColor,
                  }}
                >
                  {typeConfig[inspectingItem.type].label.toUpperCase()}
                </span>
                <span className="text-xs mono text-[#71717a]">{inspectingItem.id}</span>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded-md text-[#71717a] hover:text-white hover:bg-[#222225]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">{inspectingItem.title}</h3>
              <p className="text-xs text-[#a1a1aa] mt-1">{inspectingItem.summary}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mono">
              <div className="p-2 rounded-lg bg-[#18181b] border border-[#222225]">
                <span className="text-[10px] text-[#71717a] block">Confidence</span>
                <span className="text-white font-medium">{(inspectingItem.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded-lg bg-[#18181b] border border-[#222225]">
                <span className="text-[10px] text-[#71717a] block">Utility Score</span>
                <span className="text-white font-medium">{(inspectingItem.utilityScore * 100).toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded-lg bg-[#18181b] border border-[#222225]">
                <span className="text-[10px] text-[#71717a] block">Source</span>
                <span className="text-[#a78bfa] font-medium">{inspectingItem.source}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#18181b] border border-[#222225]">
                <span className="text-[10px] text-[#71717a] block">Created</span>
                <span className="text-white font-medium">
                  {new Date(inspectingItem.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs mono text-[#71717a] mb-1.5">DATA PAYLOAD (JSON)</div>
              <pre className="p-3 rounded-xl bg-[#09090b] border border-[#222225] text-[11px] mono text-[#e4e4e7] overflow-x-auto max-h-60">
                {JSON.stringify(inspectingItem.data, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222225]">
              <button
                onClick={() => {
                  const toEdit = inspectingItem;
                  setInspectingItem(null);
                  setEditingItem(toEdit);
                }}
                className="px-3 py-1.5 rounded-lg text-xs mono bg-[#7c3aed] text-white hover:bg-[#6d28d9] cursor-pointer"
              >
                Edit Item
              </button>
              <button
                onClick={() => setInspectingItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs mono bg-[#27272a] text-[#e4e4e7] hover:bg-[#3f3f46] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#111113] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222225] pb-3">
              <h3 className="text-sm font-semibold text-white">Edit Memory Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-md text-[#71717a] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mono">
              <div>
                <label className="text-[#a1a1aa] block mb-1">Title</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[#a1a1aa] block mb-1">Summary</label>
                <textarea
                  rows={2}
                  value={editingItem.summary}
                  onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[#a1a1aa] block mb-1">Confidence (0.0 to 1.0)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={editingItem.confidence}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      confidence: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[#a1a1aa] block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editingItem.tags.join(', ')}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#222225]">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs mono bg-[#27272a] text-[#e4e4e7] hover:bg-[#3f3f46] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  memoryEngine.update(editingItem.id, {
                    title: editingItem.title,
                    summary: editingItem.summary,
                    confidence: editingItem.confidence,
                    tags: editingItem.tags,
                  });
                  notifyChange();
                  setEditingItem(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs mono bg-[#7c3aed] text-white hover:bg-[#6d28d9] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMORY MODAL */}
      {isAddingNew && (
        <AddNewMemoryModal
          memoryEngine={memoryEngine}
          onClose={() => setIsAddingNew(false)}
          onAdded={() => {
            setIsAddingNew(false);
            notifyChange();
          }}
        />
      )}
    </div>
  );
};

// Sub-component for adding new manual memories
const AddNewMemoryModal: React.FC<{
  memoryEngine: MemoryEngine;
  onClose: () => void;
  onAdded: () => void;
}> = ({ memoryEngine, onClose, onAdded }) => {
  const [type, setType] = useState<MemoryType>('user_preference');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState(0.9);
  const [tags, setTags] = useState('');
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please provide a title');
      return;
    }

    if (type === 'user_preference') {
      memoryEngine.recordUserPreference(
        key || title.toLowerCase().replace(/\s+/g, '_'),
        val || 'custom',
        'lighting',
        true
      );
    } else if (type === 'project') {
      memoryEngine.recordProjectMemory(title, {
        notes: [summary],
      });
    } else if (type === 'visual_decision') {
      memoryEngine.recordVisualDecision('lighting', title, summary);
    } else {
      memoryEngine.create({
        type,
        title,
        summary,
        confidence,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        data: { custom: true, key, val },
        source: 'user_defined',
      });
    }

    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111113] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222225] pb-3">
          <h3 className="text-sm font-semibold text-white">Add Experience Memory</h3>
          <button onClick={onClose} className="p-1 rounded-md text-[#71717a] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs mono">
          <div>
            <label className="text-[#a1a1aa] block mb-1">Memory Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MemoryType)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
            >
              <option value="user_preference">User Preference Memory</option>
              <option value="project">Project Memory</option>
              <option value="visual_decision">Visual Decision Memory</option>
              <option value="operation">Operation Memory</option>
              <option value="failure">Failure Memory</option>
              <option value="successful_workflow">Successful Workflow Memory</option>
            </select>
          </div>

          <div>
            <label className="text-[#a1a1aa] block mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Always use soft contact shadows for perfumes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-[#a1a1aa] block mb-1">Summary / Rationale</label>
            <textarea
              rows={2}
              placeholder="Explain the experience or insight extracted..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#a1a1aa] block mb-1">Key / Target</label>
              <input
                type="text"
                placeholder="e.g. shadow_style"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-[#a1a1aa] block mb-1">Value / Rule</label>
              <input
                type="text"
                placeholder="e.g. soft_contact"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#222225]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs mono bg-[#27272a] text-[#e4e4e7] hover:bg-[#3f3f46] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs mono bg-[#7c3aed] text-white hover:bg-[#6d28d9] cursor-pointer"
          >
            Create Memory
          </button>
        </div>
      </div>
    </div>
  );
};
