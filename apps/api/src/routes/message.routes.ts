import { Router } from 'express';
import { MessageController } from '@/controllers/message.controller';
import { validateDto } from '@/middleware/validation.middleware';
import { SendMessageRequestDto } from '@raven/validators';

const router = Router();
const messageController = new MessageController();

// Get conversation messages
router.get('/conversation/:id', messageController.getConversationMessages.bind(messageController));

// Create message
router.post(
  '/',
  validateDto(SendMessageRequestDto),
  messageController.createMessage.bind(messageController)
);


// Get message by ID
router.get('/:id', messageController.getMessageById.bind(messageController));

// Delete message
router.delete('/:id', messageController.deleteMessage.bind(messageController));

export default router;
