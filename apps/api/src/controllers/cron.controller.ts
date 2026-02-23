import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import WebSocket from 'ws';

/**
 * Gateway CronJob type (as returned by cron.list RPC)
 */
interface GatewayCronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: { kind: string; expr?: string; everyMs?: number; at?: string; tz?: string };
  payload: { kind: string; message?: string; text?: string };
  delivery?: { mode: string; channel?: string; to?: string };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
}

/**
 * Transform a Gateway CronJob to the frontend CronJob format
 */
function transformCronJob(job: GatewayCronJob) {
  // Extract message from payload
  const message = job.payload?.message || job.payload?.text || '';

  // Build target from delivery info
  const channelType = job.delivery?.channel || 'unknown';
  const target = {
    channelType,
    channelId: job.delivery?.to || channelType,
    channelName: channelType,
  };

  // Build lastRun from state
  const lastRun = job.state?.lastRunAtMs
    ? {
      time: new Date(job.state.lastRunAtMs).toISOString(),
      success: job.state.lastStatus === 'ok',
      error: job.state.lastError,
      duration: job.state.lastDurationMs,
    }
    : undefined;

  // Build nextRun from state
  const nextRun = job.state?.nextRunAtMs
    ? new Date(job.state.nextRunAtMs).toISOString()
    : undefined;

  return {
    id: job.id,
    name: job.name,
    message,
    schedule: job.schedule,
    target,
    enabled: job.enabled,
    createdAt: new Date(job.createdAtMs).toISOString(),
    updatedAt: new Date(job.updatedAtMs).toISOString(),
    lastRun,
    nextRun,
  };
}

/**
 * Simple RPC helper for ZeroClaw Gateway
 */
async function callGatewayRpc(method: string, params: any = {}): Promise<any> {
  const ZEROCLAW_URL = process.env['ZEROCLAW_URL']?.replace('http', 'ws') || 'ws://127.0.0.1:42617/ws';

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(ZEROCLAW_URL);
    const requestId = Math.random().toString(36).substring(7);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === requestId) {
          ws.close();
          if (response.error) {
            reject(new Error(response.error.message || 'RPC Error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        // Ignore parse errors from other messages
      }
    });

    ws.on('error', (err: Error) => {
      reject(err);
    });

    // Timeout after 10s
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      reject(new Error(`RPC timeout for method ${method}`));
    }, 10000);
  });
}

export class CronController {
  /**
   * GET /api/v1/cron
   * List all cron jobs
   */
  async listJobs(_req: Request, res: Response): Promise<void> {
    try {
      const result = await callGatewayRpc('cron.list', { includeDisabled: true });
      const jobs = (result?.jobs ?? []) as GatewayCronJob[];

      const transformedJobs = jobs.map(transformCronJob);
      res.status(200).json({ success: true, jobs: transformedJobs });
    } catch (error: any) {
      logger.error('Failed to list cron jobs:', error);
      res.status(500).json({ success: false, message: 'Failed to list cron jobs', error: error.message });
    }
  }

  /**
   * POST /api/v1/cron
   * Create a new cron job
   */
  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { name, message, schedule, target, enabled } = req.body;

      const recipientId = target.channelId;
      const deliveryTo = target.channelType === 'discord' && recipientId
        ? `channel:${recipientId}`
        : recipientId;

      const gatewayInput = {
        name,
        schedule: { kind: 'cron', expr: schedule },
        payload: { kind: 'agentTurn', message },
        enabled: enabled ?? true,
        wakeMode: 'next-heartbeat',
        sessionTarget: 'isolated',
        delivery: {
          mode: 'announce',
          channel: target.channelType,
          to: deliveryTo,
        },
      };

      const result = await callGatewayRpc('cron.add', gatewayInput);
      res.status(200).json({ success: true, job: transformCronJob(result) });
    } catch (error: any) {
      logger.error('Failed to create cron job:', error);
      res.status(500).json({ success: false, message: 'Failed to create cron job', error: error.message });
    }
  }

  /**
   * PATCH /api/v1/cron/:id
   * Update an existing cron job
   */
  async updateJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const patch: any = { ...updates };
      if (typeof patch.schedule === 'string') {
        patch.schedule = { kind: 'cron', expr: patch.schedule };
      }
      if (typeof patch.message === 'string') {
        patch.payload = { kind: 'agentTurn', message: patch.message };
        delete patch.message;
      }

      await callGatewayRpc('cron.update', { id, patch });
      res.status(200).json({ success: true, message: 'Cron job updated successfully' });
    } catch (error: any) {
      logger.error('Failed to update cron job:', error);
      res.status(500).json({ success: false, message: 'Failed to update cron job', error: error.message });
    }
  }

  /**
   * DELETE /api/v1/cron/:id
   * Delete a cron job
   */
  async deleteJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await callGatewayRpc('cron.remove', { id });
      res.status(200).json({ success: true, message: 'Cron job deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete cron job:', error);
      res.status(500).json({ success: false, message: 'Failed to delete cron job', error: error.message });
    }
  }

  /**
   * POST /api/v1/cron/:id/trigger
   * Trigger a cron job manually
   */
  async triggerJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await callGatewayRpc('cron.run', { id, mode: 'force' });
      res.status(200).json({ success: true, message: 'Cron job triggered successfully' });
    } catch (error: any) {
      logger.error('Failed to trigger cron job:', error);
      res.status(500).json({ success: false, message: 'Failed to trigger cron job', error: error.message });
    }
  }
}

