import { IUser } from '@/models/User';

// Extend the Express Request interface globally so that authenticateToken
// can add `user` and `userId` without needing a separate AuthenticatedRequest type.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends IUser { }
    interface Request {
      userId?: string;
    }
  }
}
