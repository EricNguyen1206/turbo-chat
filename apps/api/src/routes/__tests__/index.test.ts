import express from 'express';
import request from 'supertest';
import { setupRoutes } from '../index';
import { Server as SocketIOServer } from 'socket.io';

describe('Legacy Routes Cleanup', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    const io = new SocketIOServer();
    setupRoutes(app, io);
  });

  it('should return 404 for removed friend routes', async () => {
    const response = await request(app).get('/api/v1/friends');
    expect(response.status).toBe(404);
  });
});
