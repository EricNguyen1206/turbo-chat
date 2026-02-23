import request from 'supertest';
import express, { Express } from 'express';
import { setupRoutes } from '../../routes';

// Setup minimal app for testing routes
const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock socket.io
const ioObj = {
  on: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
};

// Mock the auth middleware to bypass auth
jest.mock('@/middleware/auth.middleware', () => {
  return {
    authenticateToken: (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-123' };
      next();
    },
    optionalAuthenticateToken: (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-123' };
      next();
    }
  };
});

setupRoutes(app, ioObj as any);

describe('AI Controller REST Proxy', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should proxy settings request to ZeroClaw', async () => {
    // Mock the fetch to ZeroClaw
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { provider: 'openrouter' } }),
        ok: true,
        status: 200,
      })
    ) as jest.Mock;

    const response = await request(app).get('/api/v1/ai/settings');

    expect(response.status).toBe(200);
    expect(response.body.data.provider).toBe('openrouter');
    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:42617/settings', expect.any(Object));
  });
});
