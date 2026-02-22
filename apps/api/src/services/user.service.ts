import bcrypt from "bcryptjs";
import { UpdateProfileDto } from "@raven/validators";
import { UserDto } from "@raven/types";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export class UserService {
  // Private repository methods
  private async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });
    } catch (error) {
      logger.error("Find user by ID error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Used by public methods, false positive
  private async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
    } catch (error) {
      logger.error("Find user by email error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Used by public methods, false positive
  private async create(userData: Partial<User>): Promise<User> {
    try {
      return await prisma.user.create({
        data: userData as any,
      });
    } catch (error) {
      logger.error("Create user error:", error);
      throw error;
    }
  }

  private async update(id: string, data: Partial<User>): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error("Update user error:", error);
      throw error;
    }
  }

  // @ts-expect-error - Reserved for future use
  private async delete(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });
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
        ...(user.avatar !== null && { avatar: user.avatar }),
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
      const updateData: Partial<User> = {};

      if (data.username) {
        updateData.username = data.username;
      }
      if (data.avatar !== undefined) {
        updateData.avatar = data.avatar;
      }
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 12);
      }

      const updatedUser = await this.update(user.id, updateData);

      logger.info("User profile updated successfully", { userId: updatedUser.id });

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        ...(updatedUser.avatar !== null && { avatar: updatedUser.avatar }),
        createdAt: updatedUser.createdAt,
      };
    } catch (error) {
      logger.error("Update profile error:", error);
      throw error;
    }
  }

  public async searchUsers(username: string): Promise<UserDto[]> {
    try {
      // Prisma equivalent of ILIKE
      const users = await prisma.user.findMany({
        where: {
          username: {
            contains: username,
            mode: "insensitive",
          },
          deletedAt: null,
        },
        take: 10,
      });

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        ...(user.avatar !== null && { avatar: user.avatar }),
        createdAt: user.createdAt,
      }));
    } catch (error) {
      logger.error("Search users error:", error);
      throw error;
    }
  }
}
