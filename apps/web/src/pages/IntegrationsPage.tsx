/**
 * IntegrationsPage — Display available/active ZeroClaw integrations
 */

import { useState, useEffect, useCallback } from 'react';
import { Plug, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import type { Integration } from '@/types/zeroclaw';
import { getIntegrations } from '@/services/zeroclawApi';

const statusConfig = {
  Active: { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  Available: { icon: WifiOff, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
  ComingSoon: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-secondary', ring: 'ring-border' },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegrations();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const grouped = integrations.reduce(
    (acc, int) => {
      (acc[int.category] = acc[int.category] || []).push(int);
      return acc;
    },
    {} as Record<string, Integration[]>,
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground text-sm mt-1">Connected channels and services</p>
        </div>
        <button onClick={fetchIntegrations} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">{error}</div>
      )}

      {loading && integrations.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((int) => {
                const cfg = statusConfig[int.status] || statusConfig.Available;
                const Icon = cfg.icon;
                return (
                  <div key={int.name} className="bg-card border border-border rounded-lg p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${cfg.bg} ring-1 ${cfg.ring}`}>
                      <Plug className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{int.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
                          <Icon className="h-3 w-3" />
                          {int.status === 'ComingSoon' ? 'Coming Soon' : int.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{int.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      {integrations.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-10">No integrations found</p>
      )}
    </div>
  );
}
