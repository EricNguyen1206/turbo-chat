import { Request, Response } from 'express';
import { voiceService } from '@/services/voice.service';
import { logger } from '@/utils/logger';
import fs from 'fs';

export class VoiceController {

  async transcribe(req: Request, res: Response): Promise<void> {
    try {
      // Assuming a middleware handles file upload (e.g. multer) and sets req.file
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No audio file provided' });
        return;
      }

      const text = await voiceService.transcribeAudio(file.path);

      // Cleanup temp file
      fs.unlink(file.path, (err) => {
        if (err) logger.error('Failed to delete temp file', { path: file.path });
      });

      res.status(200).json({ success: true, text });
    } catch (error) {
      logger.error('Transcription error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during transcription' });
    }
  }

  async synthesize(req: Request, res: Response): Promise<void> {
    try {
      const { text, voice } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'Text is required for synthesis' });
        return;
      }

      const buffer = await voiceService.synthesizeSpeech(text, voice || 'alloy');

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
      });
      res.status(200).send(buffer);
    } catch (error) {
      logger.error('Synthesis error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during synthesis' });
    }
  }
}
