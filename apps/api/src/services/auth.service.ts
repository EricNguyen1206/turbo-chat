import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, IUser } from "@/models/User";
import { Session } from "@/models/Session";
import { config } from "@/config/config";
import { SignupRequestDto, SigninRequestDto } from "@raven/validators";
import { UserDto } from "@raven/types";
import { logger } from "@/utils/logger";

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
}

export class AuthService {
  public async signup(data: SignupRequestDto): Promise<UserDto> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });

      if (existingUser) {
        throw new Error("Email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create user
      const user = new User({
        username: data.username,
        email: data.email,
        password: hashedPassword,
      });

      const savedUser = await user.save();

      logger.info("User signed up successfully", { userId: savedUser.id, email: savedUser.email });

      const response: UserDto = {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      };
      if (savedUser.avatar !== undefined) {
        response.avatar = savedUser.avatar;
      }
      return response;
    } catch (error) {
      logger.error("Signup error:", error);
      throw error;
    }
  }

  public async signin(
    data: SigninRequestDto
  ): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> {
    try {
      // Find user by email
      const user = await User.findOne({ email: data.email });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Verify password
      if (!user.password) {
        throw new Error("Invalid credentials");
      }
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const { accessToken, refreshToken } = await this.createTokens(user);

      logger.info("User signed in successfully", { userId: user.id, email: user.email });

      const userResponse: UserDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
      if (user.avatar !== undefined) {
        userResponse.avatar = user.avatar;
      }

      return {
        user: userResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error("Signin error:", error);
      throw error;
    }
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Find session by refresh token
      const session = await Session.findOne({ refreshToken }).populate<{ user: IUser }>("userId");

      if (!session) {
        throw new Error("Invalid refresh token");
      }

      // Check if session is expired
      if (session.isExpired()) {
        throw new Error("Refresh token expired");
      }

      // Get user from populated field
      const user = session.userId as unknown as IUser;
      if (!user) {
        throw new Error("User not found");
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        config.jwt.secret,
        {
          expiresIn: config.jwt.accessExpire,
        } as jwt.SignOptions
      );

      logger.info("Access token refreshed", { userId: user.id, sessionId: session.id });

      return { accessToken };
    } catch (error) {
      logger.error("Refresh token error:", error);
      throw error;
    }
  }

  public async signout(refreshToken: string, userId: string): Promise<void> {
    try {
      // Find and delete session
      const session = await Session.findOne({ refreshToken, userId });

      if (session) {
        await Session.deleteOne({ _id: session._id });
        logger.info("User signed out successfully", { userId, sessionId: session.id });
      }
    } catch (error) {
      logger.error("Signout error:", error);
      throw error;
    }
  }

  public async logoutAll(userId: string): Promise<void> {
    try {
      // Delete all sessions for user
      await Session.deleteMany({ userId });

      logger.info("All sessions logged out", { userId });
    } catch (error) {
      logger.error("Logout all error:", error);
      throw error;
    }
  }

  public async createTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpire } as jwt.SignOptions
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = new Session({
      userId: user._id,
      refreshToken,
      expiresAt,
    });

    await session.save();

    return { accessToken, refreshToken };
  }

  // OAuth Provider Link / Create Flow
  public async findOrCreateOAuthUser(profile: OAuthProfile): Promise<IUser> {
    try {
      let user = await User.findOne({ email: profile.email });

      if (!user) {
        // Create new user if not exists
        let username = (profile.name ?? profile.email.split('@')[0]) as string;
        username = username.replace(/[^a-zA-Z0-9_]/g, '');
        if (!username) {
          username = `user${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Ensure username uniqueness
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        user = new User({
          username,
          email: profile.email,
          avatar: profile.avatar,
          providers: [{
            name: profile.provider,
            providerId: profile.providerId,
            email: profile.email,
            avatar: profile.avatar,
            linkedAt: new Date()
          }]
        });

        await user.save();
        logger.info(`New user created via ${profile.provider} OAuth`, { userId: user.id, email: user.email });
        return user;
      }

      // User exists - check if provider is already linked
      const existingProviderIndex = user.providers.findIndex(p => p.name === profile.provider);

      let changed = false;
      if (existingProviderIndex === -1) {
        // Link new provider to existing account (Auto-Link by Email)
        const newProvider: import("@/models/User").IProvider = profile.avatar !== undefined
          ? { name: profile.provider, providerId: profile.providerId, email: profile.email, avatar: profile.avatar, linkedAt: new Date() }
          : { name: profile.provider, providerId: profile.providerId, email: profile.email, linkedAt: new Date() };
        user.providers.push(newProvider);
        changed = true;
        logger.info(`Linked ${profile.provider} to existing user`, { userId: user.id, email: user.email });
      } else {
        // Update provider details if they changed (e.g. avatar)
        const provider = user.providers[existingProviderIndex];
        if (provider !== undefined && (provider.avatar !== profile.avatar || provider.email !== profile.email)) {
          if (profile.avatar !== undefined) {
            user.providers[existingProviderIndex]!.avatar = profile.avatar;
          } else if (provider.avatar !== undefined) {
            user.providers[existingProviderIndex]!.avatar = provider.avatar;
          }
          user.providers[existingProviderIndex]!.email = profile.email;
          changed = true;
        }
      }

      // Update main user avatar if missing
      if (profile.avatar && !user.avatar) {
        user.avatar = profile.avatar;
        changed = true;
      }

      if (changed) {
        await user.save();
      }

      return user;
    } catch (error) {
      logger.error("OAuth user processing error:", error);
      throw error;
    }
  }
}
