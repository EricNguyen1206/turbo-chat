/**
 * PairingPage — 6-digit code input to pair with ZeroClaw agent
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, AlertCircle, Loader2 } from 'lucide-react';
import { pairWithZeroClaw, getZcToken } from '@/services/zeroclawApi';

export default function PairingPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isPaired = !!getZcToken();

  const handlePair = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      await pairWithZeroClaw(trimmed);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Pairing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePair();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Link2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Pair with ZeroClaw</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Enter the 6-digit pairing code shown in your ZeroClaw terminal
          </p>
          {isPaired && (
            <p className="text-emerald-400 text-xs mt-2">✓ Already paired — you can re-pair to update</p>
          )}
        </div>

        <div className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-secondary border border-border rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handlePair}
            disabled={loading || code.length < 4}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {loading ? 'Pairing...' : 'Pair'}
          </button>
        </div>
      </div>
    </div>
  );
}
