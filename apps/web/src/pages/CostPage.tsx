/**
 * CostPage — Token usage and cost tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, RefreshCw, BarChart3, Coins, Hash } from 'lucide-react';
import type { CostSummary } from '@/types/zeroclaw';
import { getCost } from '@/services/zeroclawApi';

function usdFormat(n: number): string {
  return `$${n.toFixed(4)}`;
}

function tokenFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function CostPage() {
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCost();
      setCost(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCost();
  }, [fetchCost]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Token usage and API costs</p>
        </div>
        <button onClick={fetchCost} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">{error}</div>
      )}

      {cost && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={<DollarSign className="h-5 w-5 text-green-400" />} label="Session Cost" value={usdFormat(cost.session_cost_usd)} />
            <SummaryCard icon={<Coins className="h-5 w-5 text-yellow-400" />} label="Daily Cost" value={usdFormat(cost.daily_cost_usd)} />
            <SummaryCard icon={<BarChart3 className="h-5 w-5 text-blue-400" />} label="Monthly Cost" value={usdFormat(cost.monthly_cost_usd)} />
            <SummaryCard icon={<Hash className="h-5 w-5 text-purple-400" />} label="Total Tokens" value={tokenFormat(cost.total_tokens)} />
          </div>

          {/* Per-model breakdown */}
          {cost.by_model && Object.keys(cost.by_model).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Cost by Model</h2>
              <div className="space-y-3">
                {Object.entries(cost.by_model).map(([key, stats]) => {
                  const pct = cost.total_tokens > 0 ? (stats.total_tokens / cost.total_tokens) * 100 : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium font-mono">{stats.model || key}</span>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{tokenFormat(stats.total_tokens)} tokens</span>
                          <span>{stats.request_count} req</span>
                          <span className="text-foreground font-semibold">{usdFormat(stats.cost_usd)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(1, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {loading && !cost && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
