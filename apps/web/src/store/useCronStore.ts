import { create } from 'zustand';
import { CronJob, CronJobCreateInput, CronJobUpdateInput } from '@/types/cron';

interface CronState {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;

  fetchJobs: () => Promise<void>;
  addJob: (input: CronJobCreateInput) => Promise<void>;
  updateJob: (id: string, input: CronJobUpdateInput) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  triggerJob: (id: string) => Promise<void>;
}

const API_BASE = '/api/v1/cron';

// Helper for auth headers
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  // Assuming token is stored in localStorage by the auth system
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export const useCronStore = create<CronState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,

  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(API_BASE, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        set({ jobs: data.jobs, loading: false });
      } else {
        throw new Error(data.message || 'Failed to fetch jobs');
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addJob: async (input) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (data.success) {
        const { jobs } = get();
        set({ jobs: [...jobs, data.job], loading: false });
      } else {
        throw new Error(data.message || 'Failed to add job');
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateJob: async (id, input) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (data.success) {
        const { jobs } = get();
        set({
          jobs: jobs.map((j) => (j.id === id ? { ...j, ...input } : j)),
          loading: false,
        });
      } else {
        throw new Error(data.message || 'Failed to update job');
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        const { jobs } = get();
        set({
          jobs: jobs.filter((j) => j.id !== id),
          loading: false,
        });
      } else {
        throw new Error(data.message || 'Failed to delete job');
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  toggleJob: async (id, enabled) => {
    // Optimistic update
    const { jobs } = get();
    const oldJobs = [...jobs];
    set({
      jobs: jobs.map((j) => (j.id === id ? { ...j, enabled } : j)),
    });

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to toggle job');
      }
    } catch (err: any) {
      set({ jobs: oldJobs, error: err.message });
      throw err;
    }
  },

  triggerJob: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}/trigger`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to trigger job');
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
