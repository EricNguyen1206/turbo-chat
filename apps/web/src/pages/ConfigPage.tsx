/**
 * ConfigPage — TOML config viewer/editor for ZeroClaw
 */

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { getConfig, putConfig } from '@/services/zeroclawApi';

export default function ConfigPage() {
  const [config, setConfig] = useState('');
  const [originalConfig, setOriginalConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConfig();
      setConfig(data);
      setOriginalConfig(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await putConfig(config);
      setOriginalConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = config !== originalConfig;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ZeroClaw TOML configuration</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-600 dark:text-yellow-400 text-sm">
          Unsaved changes detected
        </div>
      )}

      <div className="flex-1 min-h-0">
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          disabled={loading}
          spellCheck={false}
          className="w-full h-full min-h-[500px] bg-background border border-border rounded-xl p-4 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          placeholder={loading ? 'Loading configuration...' : 'Configuration will appear here'}
        />
      </div>
    </div>
  );
}
