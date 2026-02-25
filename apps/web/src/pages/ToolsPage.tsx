/**
 * ToolsPage — Display registered ZeroClaw tools
 */

import { useState, useEffect, useCallback } from 'react';
import { Wrench, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { ToolSpec } from '@/types/zeroclaw';
import { getTools } from '@/services/zeroclawApi';

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTools();
      setTools(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const filtered = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tools.length} registered tool{tools.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchTools}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tools..."
          className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading && tools.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tool) => (
            <div key={tool.name} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold font-mono">{tool.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                  </div>
                </div>
                {expandedTool === tool.name ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedTool === tool.name && tool.parameters && (
                <div className="border-t border-border p-4 bg-secondary/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Parameters</p>
                  <pre className="text-xs font-mono bg-background p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-10">No tools found</p>
          )}
        </div>
      )}
    </div>
  );
}
