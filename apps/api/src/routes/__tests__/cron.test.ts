import express from 'express';
import request from 'supertest';
import { setupRoutes } from '../index';
import { Server as SocketIOServer } from 'socket.io';
import WebSocket from 'ws';

// Mock WebSocket
jest.mock('ws');

describe('Cron API Routes', () => {
  let app: express.Application;
  let mockWs: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const io = new SocketIOServer();
    setupRoutes(app, io);

    // Mock WebSocket implementation
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1 // WebSocket.OPEN
    };
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const simulateRpcSuccess = (result: any) => {
    mockWs.on.mockImplementation((event: string, callback: any) => {
      if (event === 'open') {
        setTimeout(callback, 0);
      }
      if (event === 'message') {
        const requestId = JSON.parse(mockWs.send.mock.calls[0][0]).id;
        setTimeout(() => callback(JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          result
        })), 10);
      }
    });
  };

  it('GET /api/v1/cron should list jobs', async () => {
    simulateRpcSuccess({
      jobs: [
        {
          id: 'job-1',
          name: 'Test Job',
          enabled: true,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
          schedule: { kind: 'cron', expr: '* * * * *' },
          payload: { kind: 'agentTurn', message: 'Hello' },
          state: {}
        }
      ]
    });

    const response = await request(app)
      .get('/api/v1/cron')
      .set('Authorization', 'Bearer fake-token'); // authenticateToken bypass or fake if not mocked

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].name).toBe('Test Job');
  });

  it('POST /api/v1/cron should create a job', async () => {
    simulateRpcSuccess({
      id: 'new-job-id',
      name: 'New Job',
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: 'cron', expr: '0 0 * * *' },
      payload: { kind: 'agentTurn', message: 'New Message' },
      delivery: { channel: 'discord', to: '123' },
      state: {}
    });

    const response = await request(app)
      .post('/api/v1/cron')
      .set('Authorization', 'Bearer fake-token')
      .send({
        name: 'New Job',
        message: 'New Message',
        schedule: '0 0 * * *',
        target: { channelType: 'discord', channelId: '123' },
        enabled: true
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.job.id).toBe('new-job-id');
  });

  it('PATCH /api/v1/cron/:id should update a job', async () => {
    simulateRpcSuccess({});

    const response = await request(app)
      .patch('/api/v1/cron/job-1')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('DELETE /api/v1/cron/:id should delete a job', async () => {
    simulateRpcSuccess({});

    const response = await request(app)
      .delete('/api/v1/cron/job-1')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('POST /api/v1/cron/:id/trigger should trigger a job', async () => {
    simulateRpcSuccess({});

    const response = await request(app)
      .post('/api/v1/cron/job-1/trigger')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
