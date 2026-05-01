import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Friends } from "../models/Friends";
import { Conversation } from "../models/Conversation";
import { Participant } from "../models/Participant";
import { Message } from "../models/Message";
import { ConversationType } from "@turbo-chat/types";
import { initializeDatabase, closeDatabase } from "../config/database";
import { logger } from "../utils/logger";

const SEED_PASSWORD = "password123";

async function clearDatabase() {
  logger.info("Cleaning database...");
  await User.deleteMany({});
  await Friends.deleteMany({});
  await Conversation.deleteMany({});
  await Participant.deleteMany({});
  await Message.deleteMany({});
  logger.info("Database cleaned.");
}

async function seed() {
  try {
    await initializeDatabase();
    await clearDatabase();

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12);

    // 1. Create 10 users
    logger.info("Creating users...");
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const user = await User.create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
      });
      users.push(user);
    }
    logger.info(`Created ${users.length} users.`);

    // 2. Create friend connections (everyone is friends with user1 and some others)
    logger.info("Creating friend connections...");
    for (let i = 1; i < users.length; i++) {
      await Friends.create({
        userId: users[0]?._id,
        friendId: users[i]?._id,
      });
    }
    // Some random connections
    await Friends.create({ userId: users[1]?._id, friendId: users[2]?._id });
    await Friends.create({ userId: users[2]?._id, friendId: users[3]?._id });
    await Friends.create({ userId: users[3]?._id, friendId: users[4]?._id });
    await Friends.create({ userId: users[4]?._id, friendId: users[5]?._id });
    logger.info("Friend connections created.");

    // 3. Create 5 groups
    logger.info("Creating groups...");
    const groups: any[] = [];
    for (let i = 1; i <= 5; i++) {
      const group = await Conversation.create({
        name: `Group Chat ${i}`,
        type: ConversationType.GROUP,
        ownerId: users[i % users.length]?._id,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=group${i}`,
      });
      groups.push(group);

      // Add members to each group (3-6 members per group)
      const memberCount = 3 + (i % 4);
      for (let j = 0; j < memberCount; j++) {
        const userIndex = (i + j) % users.length;
        await Participant.create({
          userId: users[userIndex]?._id,
          conversationId: group._id,
        });
      }
    }

    // Create some Direct Messages too for testing
    logger.info("Creating Direct Messages...");
    for (let i = 1; i <= 3; i++) {
      const dm = await Conversation.create({
        name: `DM ${users[0]?.username}-${users[i]?.username}`,
        type: ConversationType.DIRECT,
        ownerId: users[0]?._id,
      });
      groups.push(dm);

      await Participant.create({ userId: users[0]?._id, conversationId: dm._id });
      await Participant.create({ userId: users[i]?._id, conversationId: dm._id });
    }

    logger.info(`Created ${groups.length} conversations (groups + DMs).`);

    // 4. Create 50 messages
    logger.info("Creating messages...");
    const messageTexts = [
      "Hello everyone!",
      "How are you doing today?",
      "Did you see the latest update?",
      "I'm working on the mock data right now.",
      "This project is looking great!",
      "Let's meet tomorrow at 10 AM.",
      "Can anyone help me with this bug?",
      "Nice work on the design!",
      "I just pushed some changes.",
      "Happy coding!",
      "Don't forget the meeting.",
      "Check out this link.",
      "The API seems to be working fine.",
      "Wait, what happened?",
      "I'll be back in 5 minutes.",
    ];

    for (let i = 0; i < 50; i++) {
      const conversation = groups[i % groups.length];
      const participants = await Participant.find({ conversationId: conversation._id });
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];

      if (!randomParticipant || !conversation) continue;

      await Message.create({
        senderId: randomParticipant.userId,
        conversationId: conversation._id,
        text: messageTexts[i % messageTexts.length],
        createdAt: new Date(Date.now() - (50 - i) * 60000), // Messages spread over the last 50 minutes
      });
    }
    logger.info("50 messages created.");

    logger.info("✅ Seeding completed successfully!");
  } catch (error) {
    logger.error("❌ Seeding failed:", error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

seed();
