/**
 * ZeroClaw API Service
 *
 * Typed API client for communicating with zeroclaw through the Express proxy.
 * All calls go to /api/v1/zeroclaw/* which the backend proxies to the Rust gateway.
 */

import type {
  StatusResponse,
  HealthSnapshot,
  ToolSpec,
  MemoryEntry,
  CostSummary,
  Integration,
  DiagResult,
  CliTool,
} from '@/types/zeroclaw';

const API_BASE = '/api/v1/zeroclaw';

// ---------------------------------------------------------------------------
// ZeroClaw token management (separate from JWT auth token)
// ---------------------------------------------------------------------------

const ZC_TOKEN_KEY = 'zeroclaw_token';

export function getZcToken(): string | null {
  return localStorage.getItem(ZC_TOKEN_KEY);
}

export function setZcToken(token: string): void {
  localStorage.setItem(ZC_TOKEN_KEY, token);
}

export function clearZcToken(): void {
  localStorage.removeItem(ZC_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Base fetch wrapper
// ---------------------------------------------------------------------------

async function zcFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  // JWT auth token for erion-raven
  const jwtToken = localStorage.getItem('token');
  if (jwtToken) {
    headers.set('Authorization', `Bearer ${jwtToken}`);
  }

  // ZeroClaw pairing token
  const zcToken = getZcToken();
  if (zcToken) {
    headers.set('X-ZeroClaw-Token', zcToken);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ZeroClaw API ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

function unwrapField<T>(value: T | Record<string, T>, key: string): T {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && key in value) {
    const unwrapped = (value as Record<string, T | undefined>)[key];
    if (unwrapped !== undefined) {
      return unwrapped;
    }
  }
  return value as T;
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

export async function pairWithZeroClaw(code: string): Promise<{ token: string }> {
  const jwtToken = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  const response = await fetch(`${API_BASE}/pair`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Pairing failed (${response.status}): ${text || response.statusText}`);
  }

  const data = (await response.json()) as { token: string };
  setZcToken(data.token);
  return data;
}

// ---------------------------------------------------------------------------
// Status / Health
// ---------------------------------------------------------------------------

export function getStatus(): Promise<StatusResponse> {
  return zcFetch<StatusResponse>('/status');
}

export function getHealth(): Promise<HealthSnapshot> {
  return zcFetch<HealthSnapshot | { health: HealthSnapshot }>('/health').then((data) =>
    unwrapField(data, 'health'),
  );
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function getConfig(): Promise<string> {
  return zcFetch<string | { format?: string; content: string }>('/config').then((data) =>
    typeof data === 'string' ? data : data.content,
  );
}

export function putConfig(toml: string): Promise<void> {
  return zcFetch<void>('/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/toml' },
    body: toml,
  });
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export function getTools(): Promise<ToolSpec[]> {
  return zcFetch<ToolSpec[] | { tools: ToolSpec[] }>('/tools').then((data) =>
    unwrapField(data, 'tools'),
  );
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export function getMemory(query?: string, category?: string): Promise<MemoryEntry[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (category) params.set('category', category);
  const qs = params.toString();
  return zcFetch<MemoryEntry[] | { entries: MemoryEntry[] }>(`/memory${qs ? `?${qs}` : ''}`).then(
    (data) => unwrapField(data, 'entries'),
  );
}

export function storeMemory(key: string, content: string, category?: string): Promise<void> {
  return zcFetch<unknown>('/memory', {
    method: 'POST',
    body: JSON.stringify({ key, content, category }),
  }).then(() => undefined);
}

export function deleteMemory(key: string): Promise<void> {
  return zcFetch<void>(`/memory/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export function getCost(): Promise<CostSummary> {
  return zcFetch<CostSummary | { cost: CostSummary }>('/cost').then((data) =>
    unwrapField(data, 'cost'),
  );
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export function getIntegrations(): Promise<Integration[]> {
  return zcFetch<Integration[] | { integrations: Integration[] }>('/integrations').then((data) =>
    unwrapField(data, 'integrations'),
  );
}

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

export function runDoctor(): Promise<DiagResult[]> {
  return zcFetch<DiagResult[] | { results: DiagResult[]; summary?: unknown }>('/doctor', {
    method: 'POST',
  }).then((data) => (Array.isArray(data) ? data : data.results));
}

// ---------------------------------------------------------------------------
// CLI Tools
// ---------------------------------------------------------------------------

export function getCliTools(): Promise<CliTool[]> {
  return zcFetch<CliTool[] | { cli_tools: CliTool[] }>('/cli-tools').then((data) =>
    unwrapField(data, 'cli_tools'),
  );
}
