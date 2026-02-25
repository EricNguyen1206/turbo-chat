/**
 * DashboardPage — System overview for ZeroClaw agent
 * Shows provider, model, uptime, health, and channel status.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Cpu,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Zap,
  Brain,
  Globe,
} from 'lucide-react';
import type { StatusResponse, HealthSnapshot } from '@/types/zeroclaw';
import { getStatus, getHealth } from '@/services/zeroclawApi';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ok
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
          : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {ok ? 'Online' : 'Offline'}
    </span>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([getStatus(), getHealth()]);
      setStatus(s);
      setHealth(h);
    } catch (e: any) {
      setError(e.message || 'Failed to connect to ZeroClaw');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">ZeroClaw Agent Overview</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {status && (
        <>
          {/* Connection Status */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Agent Status
              </h2>
              <StatusBadge ok={status.paired} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard
                icon={<Brain className="h-5 w-5 text-purple-400" />}
                label="Provider"
                value={status.provider || 'None'}
              />
              <InfoCard
                icon={<Zap className="h-5 w-5 text-yellow-400" />}
                label="Model"
                value={status.model}
              />
              <InfoCard
                icon={<Clock className="h-5 w-5 text-blue-400" />}
                label="Uptime"
                value={formatUptime(status.uptime_seconds)}
              />
              <InfoCard
                icon={<Globe className="h-5 w-5 text-green-400" />}
                label="Gateway Port"
                value={String(status.gateway_port)}
              />
            </div>
          </div>

          {/* Channels */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Channels
            </h2>
            {Object.keys(status.channels).length === 0 ? (
              <p className="text-muted-foreground text-sm">No channels configured</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(status.channels).map(([name, active]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                  >
                    {active ? (
                      <Wifi className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium capitalize">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Health Components */}
      {health && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Component Health
          </h2>
          <div className="space-y-2">
            {Object.entries(health.components).map(([name, comp]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${comp.status === 'ok' || comp.status === 'healthy'
                        ? 'bg-emerald-400'
                        : comp.status === 'warn'
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`}
                  />
                  <span className="text-sm font-medium capitalize">{name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {comp.restart_count > 0 && (
                    <span className="mr-3 text-yellow-400">↻ {comp.restart_count}</span>
                  )}
                  {comp.last_error && (
                    <span className="text-red-400 truncate max-w-[200px] inline-block align-bottom">
                      {comp.last_error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
