/**
 * MemoryPage — CRUD interface for agent memory entries
 */

import { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Trash2, Search, RefreshCw } from 'lucide-react';
import type { MemoryEntry } from '@/types/zeroclaw';
import { getMemory, storeMemory, deleteMemory } from '@/services/zeroclawApi';

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMemory(searchQuery || undefined);
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      await storeMemory(newKey.trim(), newContent.trim(), newCategory.trim() || undefined);
      setNewKey('');
      setNewContent('');
      setNewCategory('');
      setShowAddForm(false);
      await fetchMemory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteMemory(key);
      setEntries((prev) => prev.filter((e) => e.key !== key));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memory</h1>
          <p className="text-muted-foreground text-sm mt-1">{entries.length} entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
          <button onClick={fetchMemory} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search memory..."
          className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Content"
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !newKey.trim() || !newContent.trim()} className="px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">{error}</div>
      )}

      {/* Category badges */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat} className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">{cat}</span>
          ))}
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-card border border-border rounded-lg p-4 group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold font-mono truncate">{entry.key}</span>
                  {entry.category && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{entry.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleDelete(entry.key)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded text-destructive transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {entries.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-10">No memory entries found</p>
        )}
      </div>
    </div>
  );
}
