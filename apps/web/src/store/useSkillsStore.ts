/**
 * Skills State Store
 * Manages skill/plugin state using proxy REST APIs and WebSocket for Gateway state
 */
import { create } from 'zustand';
import type { Skill, MarketplaceSkill } from '@/types/skill';
import { useZeroClawSocketStore } from './useZeroClawSocketStore';

// Helper to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

type GatewaySkillStatus = {
  skillKey: string;
  slug?: string;
  name?: string;
  description?: string;
  disabled?: boolean;
  emoji?: string;
  version?: string;
  author?: string;
  config?: Record<string, unknown>;
  bundled?: boolean;
  always?: boolean;
};

type ClawHubListResult = {
  slug: string;
  version?: string;
};

interface SkillsState {
  skills: Skill[];
  searchResults: MarketplaceSkill[];
  loading: boolean;
  searching: boolean;
  searchError: string | null;
  installing: Record<string, boolean>; // slug -> boolean
  error: string | null;

  // Actions
  fetchSkills: () => Promise<void>;
  searchSkills: (query: string) => Promise<void>;
  installSkill: (slug: string, version?: string) => Promise<void>;
  uninstallSkill: (slug: string) => Promise<void>;
  enableSkill: (skillId: string) => Promise<void>;
  disableSkill: (skillId: string) => Promise<void>;
  setSkills: (skills: Skill[]) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  updateSkillConfig: (skillId: string, apiKey: string, env: Record<string, string>) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  searchResults: [],
  loading: false,
  searching: false,
  searchError: null,
  installing: {},
  error: null,

  fetchSkills: async () => {
    // Only show loading state if we have no skills yet (initial load)
    if (get().skills.length === 0) {
      set({ loading: true, error: null });
    }
    try {
      // 1. Fetch from Gateway (running skills) via WebSocket RPC
      const socketStore = useZeroClawSocketStore.getState();
      let gatewaySkills: GatewaySkillStatus[] = [];
      let configResult: Record<string, { apiKey?: string; env?: Record<string, string> }> = {};

      if (socketStore.connectionState === 'connected') {
        try {
          const res = await socketStore.rpc('skills.status');
          gatewaySkills = (res as any)?.skills || [];
        } catch (e) {
          console.warn("Failed to get skills.status from gateway", e);
        }

        // Try to get configs
        try {
          // Note: We might need a REST endpoint for config if Gateway doesn't provide it via WS
          configResult = await socketStore.rpc('skills.getAllConfigs') as any || {};
        } catch (e) {
          console.warn("Failed to get skill configs from gateway", e);
        }
      }

      // 2. Fetch from Express API (ClawHub proxy)
      const token = getAuthToken();
      const listResponse = await fetch(`${API_BASE_URL}/skills/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listData = await listResponse.json();
      const clawhubSkills: ClawHubListResult[] = listData.success ? listData.skills : [];

      let combinedSkills: Skill[] = [];
      const currentSkills = get().skills;

      // Map gateway skills info
      if (gatewaySkills.length > 0) {
        combinedSkills = gatewaySkills.map((s: GatewaySkillStatus) => {
          // Merge with direct config if available
          const directConfig = configResult[s.skillKey] || {};

          return {
            id: s.skillKey,
            slug: s.slug || s.skillKey,
            name: s.name || s.skillKey,
            description: s.description || '',
            enabled: !s.disabled,
            icon: s.emoji || '📦',
            version: s.version || '1.0.0',
            author: s.author,
            config: {
              ...(s.config || {}),
              ...directConfig,
            },
            isCore: s.bundled && s.always,
            isBundled: s.bundled,
          };
        });
      }

      // Merge with ClawHub results
      if (clawhubSkills.length > 0) {
        clawhubSkills.forEach((cs: ClawHubListResult) => {
          const existing = combinedSkills.find(s => s.id === cs.slug);
          if (!existing) {
            const directConfig = configResult[cs.slug] || {};
            combinedSkills.push({
              id: cs.slug,
              slug: cs.slug,
              name: cs.slug,
              description: 'Recently installed, initializing...',
              enabled: false,
              icon: '⌛',
              version: cs.version || 'unknown',
              author: undefined,
              config: directConfig,
              isCore: false,
              isBundled: false,
            });
          }
        });
      }

      // If we got nothing from both, fallback to current skills to avoid wiping UI
      if (combinedSkills.length === 0 && currentSkills.length > 0) {
        combinedSkills = [...currentSkills];
      }

      set({ skills: combinedSkills, loading: false });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      set({ loading: false, error: String(error) });
    }
  },

  searchSkills: async (query: string) => {
    set({ searching: true, searchError: null });
    try {
      const token = getAuthToken();
      let url = `${API_BASE_URL}/skills/explore`;
      if (query) {
        url = `${API_BASE_URL}/skills/search?q=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        set({ searchResults: result.skills || [] });
      } else {
        throw new Error(result.message || 'Search failed');
      }
    } catch (error) {
      set({ searchError: String(error) });
    } finally {
      set({ searching: false });
    }
  },

  installSkill: async (slug: string, version?: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/skills/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slug, version })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Install failed');
      }
      // Refresh skills after install
      await get().fetchSkills();
    } catch (error) {
      console.error('Install error:', error);
      throw error;
    } finally {
      set((state) => {
        const newInstalling = { ...state.installing };
        delete newInstalling[slug];
        return { installing: newInstalling };
      });
    }
  },

  uninstallSkill: async (slug: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/skills/uninstall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slug })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Uninstall failed');
      }
      // Refresh skills after uninstall
      await get().fetchSkills();
    } catch (error) {
      console.error('Uninstall error:', error);
      throw error;
    } finally {
      set((state) => {
        const newInstalling = { ...state.installing };
        delete newInstalling[slug];
        return { installing: newInstalling };
      });
    }
  },

  enableSkill: async (skillId) => {
    const { updateSkill } = get();
    const socketStore = useZeroClawSocketStore.getState();

    try {
      if (socketStore.connectionState !== 'connected') {
        throw new Error('Not connected to Gateway');
      }

      const result = await socketStore.rpc('skills.update', { skillKey: skillId, enabled: true });
      if (result === undefined || result?.success !== false) {
        updateSkill(skillId, { enabled: true });
      }

    } catch (error) {
      console.error('Failed to enable skill:', error);
      throw error;
    }
  },

  disableSkill: async (skillId) => {
    const { updateSkill, skills } = get();
    const socketStore = useZeroClawSocketStore.getState();

    const skill = skills.find((s) => s.id === skillId);
    if (skill?.isCore) {
      throw new Error('Cannot disable core skill');
    }

    try {
      if (socketStore.connectionState !== 'connected') {
        throw new Error('Not connected to Gateway');
      }

      await socketStore.rpc('skills.update', { skillKey: skillId, enabled: false });

      // Assuming success
      updateSkill(skillId, { enabled: false });
    } catch (error) {
      console.error('Failed to disable skill:', error);
      throw error;
    }
  },

  updateSkillConfig: async (skillId: string, apiKey: string, env: Record<string, string>) => {
    const socketStore = useZeroClawSocketStore.getState();
    try {
      if (socketStore.connectionState !== 'connected') {
        throw new Error('Not connected to Gateway');
      }
      // ZeroClaw may or may not support skill:updateConfig via JSON-RPC. 
      // If not, we'll need an endpoint in Express. We will try RPC first.
      await socketStore.rpc('skill:updateConfig', { skillKey: skillId, apiKey, env });
      await get().fetchSkills();
    } catch (error) {
      console.error("Failed to update skill config:", error);
      throw error;
    }
  },

  setSkills: (skills) => set({ skills }),

  updateSkill: (id, updates) =>
    set((state) => ({
      skills: state.skills.map((skill) =>
        skill.id === id ? { ...skill, ...updates } : skill
      ),
    })),
}));
