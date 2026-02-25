/**
 * SSE Hook for ZeroClaw live event streaming
 *
 * Connects to zeroclaw's /api/events SSE endpoint for real-time log streaming.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SSEEvent } from '@/types/zeroclaw';
import { getZcToken } from '@/services/zeroclawApi';
import { apiUrl } from '@/lib/config';

export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface UseZeroClawSSEOptions {
  autoConnect?: boolean;
  maxEvents?: number;
  filterTypes?: string[];
}

export interface UseZeroClawSSEResult {
  events: SSEEvent[];
  status: SSEConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

/**
 * Determine the ZeroClaw SSE endpoint URL.
 * If ZEROCLAW_URL is configured, use it directly. Otherwise derive from apiUrl.
 */
function getSSEUrl(): string {
  // For direct connection to zeroclaw gateway
  const zeroclawUrl = import.meta.env.VITE_ZEROCLAW_URL;
  if (zeroclawUrl) {
    return `${zeroclawUrl}/api/events`;
  }
  // Fallback: use same host
  return `${window.location.protocol}//${window.location.host}/api/v1/zeroclaw/events`;
}

export function useZeroClawSSE(options: UseZeroClawSSEOptions = {}): UseZeroClawSSEResult {
  const { autoConnect = false, maxEvents = 500, filterTypes } = options;

  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const filterRef = useRef(filterTypes);
  filterRef.current = filterTypes;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus('connecting');

    const token = getZcToken();
    const url = `${getSSEUrl()}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setStatus('connected');
    };

    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as SSEEvent;

        if (filterRef.current && filterRef.current.length > 0) {
          if (!filterRef.current.includes(event.type)) return;
        }

        setEvents((prev) => {
          const next = [...prev, event];
          return next.length > maxEvents ? next.slice(next.length - maxEvents) : next;
        });
      } catch {
        // Ignore non-JSON events
      }
    };

    es.onerror = () => {
      setStatus('disconnected');
      es.close();
      esRef.current = null;
    };
  }, [maxEvents]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  return { events, status, connect, disconnect, clearEvents };
}
