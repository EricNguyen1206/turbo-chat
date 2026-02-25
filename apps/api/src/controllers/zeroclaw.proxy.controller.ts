/**
 * ZeroClaw Proxy Controller
 *
 * Forwards REST requests to the local ZeroClaw Rust gateway.
 * ZeroClaw exposes a REST API at /api/* with Bearer token auth.
 * This controller acts as a transparent proxy with erion-raven's
 * own JWT auth layer on top.
 */

import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ZEROCLAW_API_URL =
  process.env['ZEROCLAW_API_URL'] ||
  process.env['ZEROCLAW_URL'] ||
  'http://127.0.0.1:9090';

/**
 * Get the ZeroClaw pairing token.
 * We try the request header first (client-provided), then fall back to env.
 */
function getZeroClawToken(req: Request): string | undefined {
  const header = req.headers['x-zeroclaw-token'] as string | undefined;
  if (header) return header;
  return process.env['ZEROCLAW_TOKEN'];
}

/**
 * Generic proxy fetch to ZeroClaw REST API
 */
async function proxyFetch(
  req: Request,
  zeroclawPath: string,
  options: RequestInit = {},
): Promise<globalThis.Response> {
  const url = `${ZEROCLAW_API_URL}${zeroclawPath}`;
  const token = getZeroClawToken(req);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Forward content-type if present
  const ct = req.headers['content-type'] as string | undefined;
  if (ct) {
    headers['Content-Type'] = ct;
  }

  const fetchOptions: RequestInit = {
    method: options.method || req.method,
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }

  return fetch(url, fetchOptions);
}

/**
 * Forward response from ZeroClaw to Express client
 */
async function forwardResponse(zcRes: globalThis.Response, res: Response): Promise<void> {
  res.status(zcRes.status);

  // Forward content-type
  const ct = zcRes.headers.get('content-type');
  if (ct) {
    res.setHeader('Content-Type', ct);
  }

  if (zcRes.status === 204) {
    res.end();
    return;
  }

  const text = await zcRes.text();
  res.send(text);
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class ZeroClawProxyController {
  // ── Pairing ─────────────────────────────────────────────────
  async pair(req: Request, res: Response): Promise<void> {
    try {
      const code = req.body?.code || req.headers['x-pairing-code'];
      if (!code) {
        res.status(400).json({ error: 'Pairing code is required' });
        return;
      }

      const zcRes = await fetch(`${ZEROCLAW_API_URL}/pair`, {
        method: 'POST',
        headers: { 'X-Pairing-Code': String(code) },
      });

      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw pair failed:', error);
      res.status(502).json({ error: 'Failed to connect to ZeroClaw', details: error.message });
    }
  }

  // ── Status / Health ─────────────────────────────────────────
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/status');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getStatus failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/health');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getHealth failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Config ──────────────────────────────────────────────────
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/config');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getConfig failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  async putConfig(req: Request, res: Response): Promise<void> {
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const zcRes = await proxyFetch(req, '/api/config', {
        method: 'PUT',
        body,
      });
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw putConfig failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Tools ───────────────────────────────────────────────────
  async getTools(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/tools');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getTools failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Memory ──────────────────────────────────────────────────
  async getMemory(req: Request, res: Response): Promise<void> {
    try {
      const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const zcRes = await proxyFetch(req, `/api/memory${qs}`);
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getMemory failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  async storeMemory(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/memory', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw storeMemory failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  async deleteMemory(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'] || '';
      const zcRes = await proxyFetch(req, `/api/memory/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw deleteMemory failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Cost ────────────────────────────────────────────────────
  async getCost(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/cost');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getCost failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Integrations ────────────────────────────────────────────
  async getIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/integrations');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getIntegrations failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── Doctor ──────────────────────────────────────────────────
  async runDoctor(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/doctor', { method: 'POST' });
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw runDoctor failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }

  // ── CLI Tools ───────────────────────────────────────────────
  async getCliTools(req: Request, res: Response): Promise<void> {
    try {
      const zcRes = await proxyFetch(req, '/api/cli-tools');
      await forwardResponse(zcRes, res);
    } catch (error: any) {
      logger.error('ZeroClaw getCliTools failed:', error);
      res.status(502).json({ error: 'Failed to reach ZeroClaw', details: error.message });
    }
  }
}
