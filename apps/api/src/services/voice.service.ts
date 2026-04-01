import fs from 'fs';
import OpenAI from 'openai';
import { logger } from '@/utils/logger';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'] || 'MISSING_API_KEY',
});

export class VoiceService {
  /**
   * Transcribe an audio file to text using OpenAI Whisper.
   */
  async transcribeAudio(audioFilePath: string): Promise<string> {
    try {
      logger.info('Transcribing audio file', { audioFilePath });
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Synthesize text to speech using OpenAI TTS.
   * Returns a Buffer with MP3 data.
   */
  async synthesizeSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
    try {
      logger.info('Synthesizing speech', { textLength: text.length, voice });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      logger.error('Error synthesizing speech:', error);
      throw error;
    }
  }
}

export const voiceService = new VoiceService();
