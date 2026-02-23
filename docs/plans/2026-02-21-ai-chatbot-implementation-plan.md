# AI Chatbot Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build AI Chatbot capabilities including individual API key management, AI profiles with 3D avatars, and context window tracking.

**Architecture:** Extend existing Express/Mongoose backend to store AI profiles, user API keys, and token usage per conversation. The React frontend will communicate directly with HuggingFace Space for STT/TTS and render VRM avatars using Three.js, while syncing basic configuration via the local backend API.

**Tech Stack:** Express, Mongoose, Jest, React, WebRTC/AudioContext, Three.js, React Three Fiber.

---

### Task 1: Create AIProfile Database Model

**Files:**
- Create: `apps/api/src/models/AIProfile.ts`
- Test: `apps/api/src/models/__tests__/AIProfile.test.ts`

**Step 1: Write the failing test**

```typescript
import mongoose from 'mongoose';
import { AIProfile } from '../AIProfile';

describe('AIProfile Model', () => {
    it('should throw validation error if required fields are missing', async () => {
        const profile = new AIProfile({ systemPrompt: 'You are a dev.' });
        await expect(profile.validate()).rejects.toThrow();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/models/__tests__/AIProfile.test.ts`
Expected: FAIL with "Cannot find module '../AIProfile'"

**Step 3: Write minimal implementation**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IAIProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  systemPrompt?: string;
  avatarUrl?: string;
  voiceSettings?: any;
  model?: string;
}

const aiProfileSchema = new Schema<IAIProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  systemPrompt: { type: String },
  avatarUrl: { type: String },
  voiceSettings: { type: Schema.Types.Mixed },
  model: { type: String }
}, { timestamps: true });

export const AIProfile = mongoose.model<IAIProfile>('AIProfile', aiProfileSchema);
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/models/__tests__/AIProfile.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/models/AIProfile.ts apps/api/src/models/__tests__/AIProfile.test.ts
git commit -m "feat(api): create AIProfile schema and validation tests"
```

### Task 2: Extend User, Conversation, and Message Models

**Files:**
- Modify: `apps/api/src/models/User.ts`
- Modify: `apps/api/src/models/Conversation.ts`
- Modify: `apps/api/src/models/Message.ts`
- Test: `apps/api/src/models/__tests__/SchemaExtensions.test.ts`

**Step 1: Write the failing test**

```typescript
import mongoose from 'mongoose';
import { User } from '../User';
import { Conversation } from '../Conversation';
import { Message } from '../Message';

describe('Schema Extensions for AI Tracking', () => {
    it('should initialize and validate new extended AI fields correctly', () => {
        const user = new User({ username: 'test', llmProviders: { openai: 'sk-123' }, defaultModel: 'gpt-4o' });
        const conv = new Conversation({ aiProfileId: new mongoose.Types.ObjectId(), totalTokensUsed: 100, maxContextWindow: 4000 });
        const msg = new Message({ tokenCount: 15, isArchived: true });

        expect(user.llmProviders).toBeDefined();
        expect(conv.totalTokensUsed).toBe(100);
        expect(msg.isArchived).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/models/__tests__/SchemaExtensions.test.ts`
Expected: FAIL because added fields are not present in schema definitions.

**Step 3: Write minimal implementation**

- In `User.ts`: Add `llmProviders: { type: Map, of: String }`, `defaultModel: { type: String }` inside the User Schema.
- In `Conversation.ts`: Add `aiProfileId: { type: Schema.Types.ObjectId, ref: 'AIProfile' }`, `totalTokensUsed: { type: Number, default: 0 }`, `maxContextWindow: { type: Number, default: 8000 }`.
- In `Message.ts`: Add `tokenCount: { type: Number, default: 0 }`, `isArchived: { type: Boolean, default: false }`.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/models/__tests__/SchemaExtensions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/models/User.ts apps/api/src/models/Conversation.ts apps/api/src/models/Message.ts apps/api/src/models/__tests__/SchemaExtensions.test.ts
git commit -m "feat(api): extend user, conv, msg schemas for AI features"
```

### Task 3: Implement Token Counting in Message Creation

**Files:**
- Modify: `apps/api/src/services/message.service.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/src/services/__tests__/message.service.ai.test.ts`

**Step 1: Write the failing test**

```typescript
import { MessageService } from '../message.service';

describe('MessageService AI feature - Token Calculation', () => {
    it('should count tokens and update conversation token pool', async () => {
        // Assert token updating logic sets totalTokensUsed
        expect(true).toBe(false); // Mock failure until DB mocking logic is implemented
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/services/__tests__/message.service.ai.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Install token library (`npm install gpt-tokenizer` or similar). Calculate token count for the new message text. Update the `Conversation` model utilizing `$inc` on `totalTokensUsed` property just before persisting the newly populated Message.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/services/__tests__/message.service.ai.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/message.service.ts apps/api/package.json
git commit -m "feat(api): compute message token count and context usage"
```

### Task 4: Frontend - Configure API Key & AI Settings UI

**Files:**
- Create: `apps/web/src/components/organisms/AIProfileForm.tsx`
- Test: `apps/web/src/components/organisms/__tests__/AIProfileForm.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { AIProfileForm } from '../AIProfileForm';

describe('AIProfileForm Component', () => {
    it('should render forms to input API key and select Model', () => {
        render(<AIProfileForm onSubmit={() => {}} />);
        expect(screen.getByPlaceholderText(/Enter your API Key/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/components/organisms/__tests__/AIProfileForm.test.tsx`
Expected: FAIL with "Cannot find module '../AIProfileForm'"

**Step 3: Write minimal implementation**

```tsx
import React, { useState } from 'react';

export const AIProfileForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
    const [apiKey, setApiKey] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ apiKey }); }}>
            <input placeholder="Enter your API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <button type="submit">Save Profile</button>
        </form>
    );
};
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/components/organisms/__tests__/AIProfileForm.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/organisms/AIProfileForm.tsx apps/web/src/components/organisms/__tests__/AIProfileForm.test.tsx
git commit -m "feat(web): add API profile and settings builder form"
```

### Task 5: Frontend - Context Window Usage UI

**Files:**
- Modify: `apps/web/src/pages/ConversationPage.tsx`
- Test: `apps/web/src/pages/__tests__/ConversationPage.ai.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { ConversationPage } from '../ConversationPage';

describe('ConversationPage Context UI', () => {
    it('displays context window token capacity in the header', () => {
        // Assume context window uses 300 / 4000
        render(<ConversationPage />);
        // Mocks for useConversation hook should yield tokens => 300, max => 4000
        expect(screen.getByText(/Tokens: \d+ \/ \d+/i)).toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/pages/__tests__/ConversationPage.ai.test.tsx`
Expected: FAIL due to missing text rendered in UI.

**Step 3: Write minimal implementation**

Update `ConversationPage.tsx` to display a small inline UI element inside the chat header mapping `conversation.totalTokensUsed` and `conversation.maxContextWindow` locally to be rendered as `Tokens: {used} / {max}`.

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/pages/__tests__/ConversationPage.ai.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/pages/ConversationPage.tsx
git commit -m "feat(web): add token context window display to conversation header"
```
