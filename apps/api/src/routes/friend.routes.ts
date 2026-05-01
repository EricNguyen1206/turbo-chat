import { Router } from 'express';
import { FriendController } from '@/controllers/friend.controller';
import { validateDto } from '@/middleware/validation.middleware';
import { SendFriendRequestApiRequestDto } from '@turbo-chat/validators';

const router = Router();
const friendController = new FriendController();

// GET /api/v1/friends - Get all friends
router.get('/', friendController.getFriends.bind(friendController));

// GET /api/v1/friends/requests - Get all friend requests (sent and received)
router.get('/requests', friendController.getFriendRequests.bind(friendController));

// POST /api/v1/friends/requests - Send a friend request
router.post('/requests', validateDto(SendFriendRequestApiRequestDto), friendController.sendFriendRequest.bind(friendController));

// POST /api/v1/friends/requests/:requestId/accept - Accept a friend request
router.post('/requests/:requestId/accept', friendController.acceptFriendRequest.bind(friendController));

// POST /api/v1/friends/requests/:requestId/decline - Decline a friend request
router.post('/requests/:requestId/decline', friendController.declineFriendRequest.bind(friendController));

// GET /api/v1/friends/online-status - Get online status for all friends
router.get('/online-status', friendController.getFriendsOnlineStatus.bind(friendController));

export { router as friendRoutes };
