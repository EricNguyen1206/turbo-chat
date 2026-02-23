# ClawX UI Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up legacy peer-to-peer chat features and integrate the ClawX React UI components (Chat, Settings, Skills, Cron Tasks) using a Hybrid Architecture (Express REST & WebSocket Proxy) connected to the local ZeroClaw Rust gateway.

**Architecture:** 
- **Backend:** Express routes (`/api/ai/*`) proxying to ZeroClaw (`127.0.0.1:42617`).
- **Frontend:** React + Zustand for state management, adapted from ClawX components.

**Tech Stack:** Express, Mongoose, React, Zustand.

---

### Task 1: Cleanup Legacy Backend Models & Controllers

**Files:**
- Modify: `apps/api/src/routes/index.ts`
- Delete: `apps/api/src/models/FriendRequest.ts`
- Delete: `apps/api/src/models/Friends.ts`
- Delete: `apps/api/src/models/Participant.ts`
- Delete: `apps/api/src/controllers/friend.controller.ts`
- Delete: `apps/api/src/routes/friend.routes.ts`

**Step 1: Write the failing test**

```typescript
// apps/api/src/routes/__tests__/index.test.ts
import request from 'supertest';
import { app } from '../../app'; // Assuming an exported app instance

describe('Legacy Routes Cleanup', () => {
    it('should return 404 for removed friend routes', async () => {
        const response = await request(app).get('/api/friends');
        expect(response.status).toBe(404);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/routes/__tests__/index.test.ts`
Expected: FAIL (returns 200 or 401 instead of 404 because the route still exists)

**Step 3: Write minimal implementation**

Remove the `friend.routes.ts` import and usage from `apps/api/src/routes/index.ts`. Delete the associated model and controller files.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/routes/__tests__/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git rm apps/api/src/models/FriendRequest.ts apps/api/src/models/Friends.ts apps/api/src/models/Participant.ts apps/api/src/controllers/friend.controller.ts apps/api/src/routes/friend.routes.ts
git add apps/api/src/routes/index.ts apps/api/src/routes/__tests__/index.test.ts
git commit -m "refactor(api): remove legacy friend and participant models and routes"
```

### Task 2: Implement AI Express Routes (REST Proxy to ZeroClaw)

**Files:**
- Create: `apps/api/src/controllers/ai.controller.ts`
- Create: `apps/api/src/routes/ai.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/src/controllers/__tests__/ai.controller.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/api/src/controllers/__tests__/ai.controller.test.ts
import request from 'supertest';
import { app } from '../../app';

describe('AI Controller REST Proxy', () => {
    it('should proxy settings request to ZeroClaw', async () => {
        // Mock the fetch to ZeroClaw
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ success: true, data: { provider: 'openrouter' } }),
            })
        ) as jest.Mock;

        const response = await request(app).get('/api/ai/settings');
        expect(response.status).toBe(200);
        expect(response.body.data.provider).toBe('openrouter');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/controllers/__tests__/ai.controller.test.ts`
Expected: FAIL (route /api/ai/settings does not exist)

**Step 3: Write minimal implementation**

Create `ai.controller.ts` with a function to fetch from `http://127.0.0.1:42617`. Create `ai.routes.ts` mapping GET `/settings` to that controller function. Mount `/api/ai` in `index.ts`.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/controllers/__tests__/ai.controller.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/controllers/ai.controller.ts apps/api/src/routes/ai.routes.ts apps/api/src/routes/index.ts apps/api/src/controllers/__tests__/ai.controller.test.ts
git commit -m "feat(api): implement ai controller REST proxy for zeroclaw settings"
```

### Task 3: Cleanup Legacy Frontend Pages

**Files:**
- Modify: `apps/web/src/App.tsx` (or Main Router)
- Delete: `apps/web/src/pages/ContactsPage.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/src/pages/__tests__/Routing.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../../AppRouter';

describe('Frontend Routing Cleanup', () => {
    it('should not render ContactsPage', () => {
        render(
            <MemoryRouter initialEntries={['/contacts']}>
                <AppRouter />
            </MemoryRouter>
        );
        expect(screen.queryByText(/Contacts/i)).toBeNull();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/pages/__tests__/Routing.test.tsx`
Expected: FAIL (Contacts page still renders)

**Step 3: Write minimal implementation**

Remove the `/contacts` route from the frontend router definition and delete `ContactsPage.tsx`.

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/pages/__tests__/Routing.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git rm apps/web/src/pages/ContactsPage.tsx
git add apps/web/src/App.tsx apps/web/src/pages/__tests__/Routing.test.tsx
git commit -m "refactor(web): remove legacy Contacts page"
```

### Task 4: Port ClawX AI Settings Components

**Files:**
- Create: `apps/web/src/components/ai/AISettingsPanel.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Test: `apps/web/src/components/ai/__tests__/AISettingsPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/src/components/ai/__tests__/AISettingsPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { AISettingsPanel } from '../AISettingsPanel';

describe('AISettingsPanel Component', () => {
    it('renders provider selection and API key input', () => {
        render(<AISettingsPanel />);
        expect(screen.getByLabelText(/AI Provider/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/components/ai/__tests__/AISettingsPanel.test.tsx`
Expected: FAIL (AISettingsPanel does not exist)

**Step 3: Write minimal implementation**

Create the `AISettingsPanel.tsx` (adapted from the sandbox ClawX repo) using standard React hooks to hit the `/api/ai/settings` endpoint. Integrate it into `SettingsPage.tsx`.

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/components/ai/__tests__/AISettingsPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/ai/AISettingsPanel.tsx apps/web/src/pages/SettingsPage.tsx apps/web/src/components/ai/__tests__/AISettingsPanel.test.tsx
git commit -m "feat(web): port ClawX AISettingsPanel connected to backend proxy"
```

### Next Phases (To be expanded during implementation)
- **Task 5:** Port Chat UI and setup WebSocket proxying in Express.
- **Task 6:** Port Skills Management UI and API routes.
- **Task 7:** Port Cron Task UI and API routes.
