/**
 * DoctorPage — Run ZeroClaw diagnostics
 */

import { useState, useCallback } from 'react';
import { Stethoscope, Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DiagResult } from '@/types/zeroclaw';
import { runDoctor } from '@/services/zeroclawApi';

const severityConfig = {
  ok: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'OK' },
  warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Warning' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Error' },
};

export default function DoctorPage() {
  const [results, setResults] = useState<DiagResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunDoctor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runDoctor();
      setResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const okCount = results?.filter((r) => r.severity === 'ok').length ?? 0;
  const warnCount = results?.filter((r) => r.severity === 'warn').length ?? 0;
  const errorCount = results?.filter((r) => r.severity === 'error').length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Doctor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Run system diagnostics</p>
        </div>
        <button
          onClick={handleRunDoctor}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
        >
          <Play className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">{error}</div>
      )}

      {results && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard count={okCount} label="Passed" color="text-emerald-400" bg="bg-emerald-500/10" />
            <SummaryCard count={warnCount} label="Warnings" color="text-yellow-400" bg="bg-yellow-500/10" />
            <SummaryCard count={errorCount} label="Errors" color="text-red-400" bg="bg-red-500/10" />
          </div>

          {/* Results */}
          <div className="space-y-2">
            {results.map((result, i) => {
              const cfg = severityConfig[result.severity] || severityConfig.ok;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-4 ${cfg.bg} rounded-lg border border-border`}>
                  <Icon className={`h-5 w-5 ${cfg.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{result.category}</span>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-foreground">{result.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Stethoscope className="h-12 w-12 mb-3 opacity-50" />
          <p>Click "Run Diagnostics" to check your ZeroClaw installation</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
