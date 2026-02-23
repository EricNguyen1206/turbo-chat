import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

const ZEROCLAW_URL = process.env['ZEROCLAW_URL'] || 'http://127.0.0.1:42617';

export class AIController {

  /**
   * Proxy GET requests to ZeroClaw /settings
   */
  async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const response = await fetch(`${ZEROCLAW_URL}/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ZeroClaw responded with status: ${response.status}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error('Error proxying to ZeroClaw /settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to communicate with AI Gateway',
        error: error.message,
      });
    }
  }
}
