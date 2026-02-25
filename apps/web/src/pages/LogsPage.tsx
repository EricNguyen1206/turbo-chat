/**
 * LogsPage — Real-time log viewer using SSE
 */

import { useState } from 'react';
import { ScrollText, Play, Pause, Trash2 } from 'lucide-react';
import { useZeroClawSSE } from '@/hooks/useZeroClawSSE';

export default function LogsPage() {
  const { events, status, connect, disconnect, clearEvents } = useZeroClawSSE({ maxEvents: 1000 });
  const [filterType, setFilterType] = useState('');

  const connected = status === 'connected';

  const eventTypes = [...new Set(events.map((e) => e.type).filter(Boolean))];
  const filtered = filterType ? events.filter((e) => e.type === filterType) : events;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {events.length} events — {status}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearEvents}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={connected ? disconnect : connect}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${connected
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
          >
            {connected ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {connected ? 'Pause' : 'Start'}
          </button>
        </div>
      </div>

      {/* Filter */}
      {eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('')}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
          >
            All
          </button>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Log entries */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-background border border-border rounded-xl p-3 font-mono text-xs space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ScrollText className="h-10 w-10 mb-3 opacity-50" />
            <p>{connected ? 'Waiting for events...' : 'Click Start to begin streaming logs'}</p>
          </div>
        ) : (
          filtered.map((event, i) => (
            <div key={i} className="flex items-start gap-2 py-1 hover:bg-secondary/50 rounded px-2">
              <span className="text-muted-foreground flex-shrink-0 w-20 truncate">
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '--:--:--'}
              </span>
              <span className="text-primary flex-shrink-0 w-24 truncate">[{event.type}]</span>
              <span className="text-foreground">{JSON.stringify(event, null, 0)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
