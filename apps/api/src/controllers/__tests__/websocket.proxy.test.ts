import request from 'supertest';
import express, { Express } from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

describe('WebSocket Proxy Configuration', () => {
  let mockZeroClawApp: Express;
  let mockZeroClawServer: any;
  let proxyApp: Express;
  let proxyServer: any;
  const ZEROCLAW_PORT = 42618; // Use different port for testing

  beforeAll((done) => {
    // 1. Setup Mock ZeroClaw Target
    mockZeroClawApp = express();
    mockZeroClawApp.get('/api/health', (_req, res) => {
      res.status(200).json({ status: 'zeroclaw-mock-ok' });
    });
    mockZeroClawServer = createServer(mockZeroClawApp);

    mockZeroClawServer.on('upgrade', (_req: any, socket: any, _head: any) => {
      socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        '\r\n');
      socket.pipe(socket); // Echo
    });

    mockZeroClawServer.listen(ZEROCLAW_PORT, () => {

      // 2. Setup Proxy Server (like our index.ts)
      proxyApp = express();
      proxyApp.use(
        '/api/v1/ai/ws',
        createProxyMiddleware({
          target: `http://127.0.0.1:${ZEROCLAW_PORT}`,
          changeOrigin: true,
          ws: true,
        })
      );
      proxyServer = createServer(proxyApp);
      proxyServer.listen(0, done);
    });
  });

  afterAll((done) => {
    proxyServer.close(() => {
      mockZeroClawServer.close(done);
    });
  });

  it('should proxy regular HTTP requests if targeted', async () => {
    // Technically http-proxy-middleware will proxy HTTP as well on that path.
    const response = await request(proxyServer).get('/api/v1/ai/ws/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('zeroclaw-mock-ok');
  });

  // Note: supertest doesn't natively support testing WebSockets upgrades easily.
  // We mainly want to ensure the middleware configuration is syntactically valid and mounts properly.
  // The HTTP test above proves the proxy middleware routes traffic to the target correctly.
});
