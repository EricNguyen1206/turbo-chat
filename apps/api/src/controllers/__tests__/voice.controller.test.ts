import { Request, Response } from 'express';
import { VoiceController } from '../voice.controller';
import { voiceService } from '@/services/voice.service';
import fs from 'fs';

jest.mock('@/services/voice.service', () => ({
  voiceService: {
    transcribeAudio: jest.fn(),
    synthesizeSpeech: jest.fn()
  }
}));
jest.mock('fs');

describe('VoiceController', () => {
  let controller: VoiceController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new VoiceController();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('transcribe', () => {
    it('returns 400 if no file provided', async () => {
      req = { file: undefined };
      await controller.transcribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No audio file provided' });
    });

    it('transcribes successfully and deletes temp file', async () => {
      req = { file: { path: '/tmp/test.webm' } as any };
      (voiceService.transcribeAudio as jest.Mock).mockResolvedValue('test text');

      await controller.transcribe(req as Request, res as Response);

      expect(voiceService.transcribeAudio).toHaveBeenCalledWith('/tmp/test.webm');
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.webm', expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, text: 'test text' });
    });

    it('handles transcription errors', async () => {
      req = { file: { path: '/tmp/test.webm' } as any };
      (voiceService.transcribeAudio as jest.Mock).mockRejectedValue(new Error('API failure'));

      await controller.transcribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error during transcription' });
    });
  });

  describe('synthesize', () => {
    it('returns 400 if no text provided', async () => {
      req = { body: {} };
      await controller.synthesize(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Text is required for synthesis' });
    });

    it('synthesizes successfully', async () => {
      req = { body: { text: 'Hello world', voice: 'echo' } };
      const mockBuffer = Buffer.from('audio data');
      (voiceService.synthesizeSpeech as jest.Mock).mockResolvedValue(mockBuffer);

      await controller.synthesize(req as Request, res as Response);

      expect(voiceService.synthesizeSpeech).toHaveBeenCalledWith('Hello world', 'echo');
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'audio/mpeg',
        'Content-Length': mockBuffer.length,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('handles synthesis errors', async () => {
      req = { body: { text: 'Hello' } };
      (voiceService.synthesizeSpeech as jest.Mock).mockRejectedValue(new Error('API failure'));

      await controller.synthesize(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error during synthesis' });
    });
  });
});
