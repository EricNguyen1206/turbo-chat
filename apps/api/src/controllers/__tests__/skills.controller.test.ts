import { Request, Response } from 'express';
import { SkillsController } from '../skills.controller';

// Mock child_process and fs
jest.mock('child_process', () => ({
  exec: jest.fn()
}));
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: jest.fn((fn) => fn)
  };
});
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    rm: jest.fn(),
    writeFile: jest.fn(),
  },
  readFileSync: jest.fn(),
}));

describe('SkillsController', () => {
  let controller: SkillsController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new SkillsController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { query: {}, body: {} };
    res = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  describe('listInstalled', () => {
    it('should parse list output correctly', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({
        stdout: `google-search v1.0.0
calculator v2.1.0`,
        stderr: ''
      });

      await controller.listInstalled(req as Request, res as Response);

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('npx clawhub list'), expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        skills: [
          { slug: 'google-search', version: '1.0.0' },
          { slug: 'calculator', version: '2.1.0' }
        ]
      });
    });

    it('should handle no installed skills', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({
        stdout: `No installed skills found.`,
        stderr: ''
      });

      await controller.listInstalled(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        skills: []
      });
    });
  });

  describe('explore', () => {
    it('should parse explore output correctly', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({
        stdout: `fetch-web v1.2.0 2 hours ago Fetch content from web pages
system-stats v0.9.0 yesterday Get system statistics`,
        stderr: ''
      });

      await controller.explore(req as Request, res as Response);

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('npx clawhub explore'), expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        skills: [
          { slug: 'fetch-web', name: 'fetch-web', version: '1.2.0', description: 'Fetch content from web pages' },
          { slug: 'system-stats', name: 'system-stats', version: '0.9.0', description: 'Get system statistics' }
        ]
      });
    });
  });

  describe('search', () => {
    it('should parse search output correctly', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({
        stdout: `fetch-web v1.2.0 Fetch content from web pages (0.89)
system-stats v0.9.0 Get system statistics (0.75)`,
        stderr: ''
      });
      req.query = { q: 'fetch' };

      await controller.search(req as Request, res as Response);

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('npx clawhub search "fetch"'), expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        skills: [
          { slug: 'fetch-web', name: 'fetch-web', version: '1.2.0', description: 'Fetch content from web pages' },
          { slug: 'system-stats', name: 'system-stats', version: '0.9.0', description: 'Get system statistics' }
        ]
      });
    });

    it('should fallback to explore if query is empty', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({
        stdout: ``,
        stderr: ''
      });
      req.query = { q: '' };
      await controller.search(req as Request, res as Response);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('npx clawhub explore'), expect.any(Object));
    });
  });

  describe('install', () => {
    it('should execute install command', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockResolvedValue({ stdout: 'Done', stderr: '' });
      req.body = { slug: 'new-skill', version: '1.0.0' };

      await controller.install(req as Request, res as Response);

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('npx clawhub install new-skill --version 1.0.0'), expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('uninstall', () => {
    it('should delete skill directory', async () => {
      const mockFs = require('fs');
      mockFs.existsSync.mockReturnValue(true);
      req.body = { slug: 'old-skill' };

      await controller.uninstall(req as Request, res as Response);

      expect(mockFs.promises.rm).toHaveBeenCalledWith(expect.stringContaining('old-skill'), expect.any(Object));
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
