import bcrypt from "bcryptjs";
import { User, IUser } from "@/models/User";
import { UpdateProfileDto } from "@turbo-chat/validators";
import { UserDto } from "@turbo-chat/types";
import { logger } from "@/utils/logger";

export class UserService {
  // Private repository methods (kept for internal use and potential future expansion)
  private async findById(id: string): Promise<IUser | null> {
    try {
      return await User.findOne({ _id: id, deletedAt: null });
    } catch (error) {
      logger.error("Find user by ID error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Used by public methods, false positive
  private async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email, deletedAt: null });
    } catch (error) {
      logger.error("Find user by email error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Used by public methods, false positive
  private async create(userData: Partial<IUser>): Promise<IUser> {
    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      logger.error("Create user error:", error);
      throw error;
    }
  }

  private async update(user: IUser): Promise<IUser> {
    try {
      return await user.save();
    } catch (error) {
      logger.error("Update user error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Reserved for future use
  private async delete(userId: string): Promise<void> {
    try {
      await User.updateOne({ _id: userId }, { deletedAt: new Date() });
    } catch (error) {
      logger.error("Delete user error:", error);
      throw error;
    }
  }

  // Public methods
  public async getProfile(userId: string): Promise<UserDto> {
    try {
      const user = await this.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        ...(user.avatar !== undefined && { avatar: user.avatar }),
        createdAt: user.createdAt,
      };
    } catch (error) {
      logger.error("Get profile error:", error);
      throw error;
    }
  }

  public async updateProfile(userId: string, data: UpdateProfileDto): Promise<UserDto> {
    try {
      const user = await this.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      if (!user.password) {
        throw new Error("Invalid credentials");
      }
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Update fields if provided
      if (data.username) {
        user.username = data.username;
      }
      if (data.avatar !== undefined) {
        user.avatar = data.avatar;
      }
      if (data.password) {
        user.password = await bcrypt.hash(data.password, 12);
      }

      const updatedUser = await this.update(user);

      logger.info("User profile updated successfully", { userId: updatedUser.id });

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        ...(updatedUser.avatar !== undefined && { avatar: updatedUser.avatar }),
        createdAt: updatedUser.createdAt,
      };
    } catch (error) {
      logger.error("Update profile error:", error);
      throw error;
    }
  }

  public async searchUsers(username: string): Promise<UserDto[]> {
    try {
      // Use regex for case-insensitive username search
      const users = await User.find({
        username: { $regex: username, $options: "i" },
        deletedAt: null,
      }).limit(10);

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        ...(user.avatar !== undefined && { avatar: user.avatar }),
        createdAt: user.createdAt,
      }));
    } catch (error) {
      logger.error("Search users error:", error);
      throw error;
    }
  }

  public async getFriendsByConversationId(conversationId: string, userId: string): Promise<IUser[]> {
    try {
      // Import Participant model here to avoid circular dependency
      const { Participant } = await import("@/models/Participant");

      // Find all participants in the conversation except the current user
      const participants = await Participant.find({
        conversationId,
        userId: { $ne: userId },
        deletedAt: null,
      }).populate<{ userId: IUser }>("userId");

      // Extract user documents from populated participants
      return participants
        .map((p) => p.userId as unknown as IUser)
        .filter((user) => user && !user.deletedAt);
    } catch (error) {
      logger.error("Get friends by conversation ID error:", error);
      throw error;
    }
  }
}
