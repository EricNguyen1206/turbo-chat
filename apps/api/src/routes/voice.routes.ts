import { Router } from 'express';
import multer from 'multer';
import { VoiceController } from '@/controllers/voice.controller';

const router = Router();
const voiceController = new VoiceController();

// Use multer for temp file upload handling
const upload = multer({ dest: 'uploads/' });

// Transcribe an uploaded audio file
router.post('/transcribe', upload.single('audio'), voiceController.transcribe.bind(voiceController));

// Synthesize text into speech
router.post('/synthesize', voiceController.synthesize.bind(voiceController));

export default router;
