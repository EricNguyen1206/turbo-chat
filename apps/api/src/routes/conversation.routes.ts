import { Router } from 'express';
import { ConversationController } from '@/controllers/conversation.controller';
import { validateDto } from '@/middleware/validation.middleware';
import {
  CreateConversationRequestDto,
  UpdateConversationRequestDto,
} from '@raven/validators';

const router = Router();
const conversationController = new ConversationController();

// GET /api/v1/conversations
router.get('/', conversationController.getUserConversations.bind(conversationController));

// POST /api/v1/conversations
router.post('/', validateDto(CreateConversationRequestDto), conversationController.createConversation.bind(conversationController));

// GET /api/v1/conversations/:id
router.get('/:id', conversationController.getConversationById.bind(conversationController));

// PUT /api/v1/conversations/:id
router.put('/:id', validateDto(UpdateConversationRequestDto), conversationController.updateConversation.bind(conversationController));

// DELETE /api/v1/conversations/:id
router.delete('/:id', conversationController.deleteConversation.bind(conversationController));




// Mark conversation as read
router.post('/:id/read', conversationController.markAsRead);


export { router as conversationRoutes };
