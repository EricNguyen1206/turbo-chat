# Supabase Database Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the backend data layer from MongoDB to Supabase (PostgreSQL) using Prisma ORM, and create a data migration script to move existing data.

**Architecture:** 
- We will replace `mongoose` with Prisma ORM in the `apps/api` package.
- The Prisma schema will mirror the existing MongoDB models, using String IDs to maintain compatibility with existing MongoDB ObjectIds during migration.
- A standalone data migration script will be written to read from the live MongoDB cluster and write to the new Supabase Postgres database.

**Tech Stack:** Node.js, Express, Prisma ORM, PostgreSQL (Supabase), MongoDB driver (for migration script).

---

### Task 1: Setup Prisma and Database Connection

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/package.json`
- Modify: `apps/api/.env`

**Step 1: Install Prisma dependencies**
Run: `cd apps/api && pnpm add -D prisma && pnpm add @prisma/client`
Expected: Packages installed successfully.

**Step 2: Initialize Prisma schema**
Run: `cd apps/api && npx prisma init`
Expected: Creates `prisma/schema.prisma` and updates `.env`.

**Step 3: Update schema.prisma provider**
Modify `apps/api/prisma/schema.prisma` to use postgresql:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**Step 4: Commit**
```bash
git add apps/api/package.json apps/api/prisma apps/api/.env
git commit -m "chore: setup prisma for supabase migration"
```

---

### Task 2: Define Prisma Models & Generate Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Write equivalent Prisma models**
Add the following to `schema.prisma`:
```prisma
model User {
  id           String    @id @default(cuid())
  username     String    @unique
  email        String    @unique
  password     String?
  avatar       String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  llmProviders Json?
  defaultModel String?

  sessions      Session[]
  conversations Conversation[]
  messages      Message[]
  aiProfiles    AIProfile[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Conversation {
  id               String    @id @default(cuid())
  name             String
  avatar           String?
  ownerId          String
  type             String    @default("GROUP")
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  isAiAgent        Boolean   @default(true)
  systemPrompt     String?   @default("You are a helpful AI assistant.")
  aiModel          String?   @default("gpt-4o-mini")
  aiProfileId      String?
  totalTokensUsed  Int?      @default(0)
  maxContextWindow Int?      @default(8000)

  owner     User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  aiProfile AIProfile? @relation(fields: [aiProfileId], references: [id], onDelete: SetNull)
  messages  Message[]
}

model Message {
  id             String    @id @default(cuid())
  senderId       String
  conversationId String?
  text           String?
  url            String?
  fileName       String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  tokenCount     Int?      @default(0)
  isArchived     Boolean   @default(false)

  sender       User          @relation(fields: [senderId], references: [id], onDelete: Cascade)
  conversation Conversation? @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model AIProfile {
  id            String   @id @default(cuid())
  userId        String
  name          String
  systemPrompt  String?
  avatarUrl     String?
  voiceSettings Json?
  model         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversations Conversation[]
}
```

**Step 2: Generate Prisma Client**
Run: `cd apps/api && npx prisma generate`
Expected: Prisma client generated.

*(Note: Actual `prisma db push` or `prisma migrate dev` should be run manually by the user when they have their Supabase `DATABASE_URL` ready).*

**Step 3: Commit**
```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat: define supabase postgres schema with prisma"
```

---

### Task 3: Write Mongoose to Prisma Migration Script

**Files:**
- Create: `apps/api/scripts/migrate-db.ts`
- Modify: `apps/api/package.json`

**Step 1: Install MongoDB driver for script**
Run: `cd apps/api && pnpm add -D mongodb`

**Step 2: Write the migration script**
Create `apps/api/scripts/migrate-db.ts`:
```typescript
import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");
  
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  console.log("Connected to MongoDB");

  // Migrate Users
  const users = await db.collection('users').find().toArray();
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user._id.toString() },
      update: {},
      create: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: user.password,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        llmProviders: user.llmProviders || {},
        defaultModel: user.defaultModel,
      }
    });
  }
  console.log(`Migrated ${users.length} users.`);

  // Migrate AIProfiles
  const profiles = await db.collection('aiprofiles').find().toArray();
  for (const p of profiles) {
    await prisma.aIProfile.upsert({
      where: { id: p._id.toString() },
      update: {},
      create: {
        id: p._id.toString(),
        userId: p.userId.toString(),
        name: p.name,
        systemPrompt: p.systemPrompt,
        avatarUrl: p.avatarUrl,
        voiceSettings: p.voiceSettings || {},
        model: p.model,
        createdAt: p.createdAt || new Date(),
        updatedAt: p.updatedAt || new Date(),
      }
    });
  }
  console.log(`Migrated ${profiles.length} AI profiles.`);

  // Migrate Conversations
  const convos = await db.collection('conversations').find().toArray();
  for (const c of convos) {
    await prisma.conversation.upsert({
      where: { id: c._id.toString() },
      update: {},
      create: {
        id: c._id.toString(),
        name: c.name,
        avatar: c.avatar,
        ownerId: c.ownerId.toString(),
        type: c.type,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        deletedAt: c.deletedAt,
        isAiAgent: c.isAiAgent,
        systemPrompt: c.systemPrompt,
        aiModel: c.aiModel,
        aiProfileId: c.aiProfileId?.toString(),
        totalTokensUsed: c.totalTokensUsed,
        maxContextWindow: c.maxContextWindow,
      }
    });
  }
  console.log(`Migrated ${convos.length} conversations.`);

  // Migrate Messages
  const messages = await db.collection('messages').find().toArray();
  for (const m of messages) {
    await prisma.message.upsert({
      where: { id: m._id.toString() },
      update: {},
      create: {
        id: m._id.toString(),
        senderId: m.senderId.toString(),
        conversationId: m.conversationId?.toString(),
        text: m.text,
        url: m.url,
        fileName: m.fileName,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        deletedAt: m.deletedAt,
        tokenCount: m.tokenCount,
        isArchived: m.isArchived,
      }
    });
  }
  console.log(`Migrated ${messages.length} messages.`);

  console.log("Migration Complete!");
  await client.close();
  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
```

**Step 3: Update package.json scripts**
Modify `apps/api/package.json` scripts to add:
```json
"migrate-db": "ts-node scripts/migrate-db.ts"
```

**Step 4: Commit**
```bash
git add apps/api/scripts/migrate-db.ts apps/api/package.json
git commit -m "feat: add mongo to supabase data migration script"
```

---

### Task 4: Refactor API Codebase to use Prisma

**Files:**
- Modify: `apps/api/src/controllers/*.ts`
- Modify: `apps/api/src/services/*.ts`

*(Note: This is a large task and should be done iteratively. The engineer will need to search for `mongoose`, `findById`, `findOne`, `save()` across the codebase and replace them with Prisma equivalents like `prisma.user.findUnique`, `prisma.conversation.create`. Since this heavily affects business logic, this task must be broken down further per-controller during execution).*

**Step 1: Create Prisma Client Instance**
Create `apps/api/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

**Step 2: Iteratively Replace Controllers (Example: auth controller)**
Review controllers and replace Mongo imports with `prisma`.

**Step 3: Commit**
```bash
git commit -m "refactor: transition core services to prisma"
```
