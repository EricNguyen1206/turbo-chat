/**
 * Authentication Store
 *
 * Security: Uses httpOnly cookies managed by the backend.
 * No JWT tokens are stored in frontend memory or localStorage.
 * The backend sets secure httpOnly cookies on signin/refresh.
 */

import { create } from "zustand";
import { persist, createJSONStorage, devtools } from "zustand/middleware";
import { authService } from "@/services/authService";
import { toast } from "react-toastify";
import { UserDto } from "@raven/types";
import apiClient from "@/lib/axios-client";

export interface AuthState {
  user: UserDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  checkAuthAttempts: number;

  signUp: (username: string, password: string, email: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  getProfile: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearState: () => void;
  startSessionMonitor: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        loading: false,
        isAuthenticated: false,
        checkAuthAttempts: 0,

        clearState: () => {
          set({ user: null, loading: false, isAuthenticated: false, checkAuthAttempts: 0 });
        },

        signUp: async (username, password, email) => {
          try {
            set({ loading: true });
            await authService.signUp({ username, password, email });
            toast.success("Registration successful! Please sign in.");
            return true;
          } catch (error) {
            console.error(error);
            toast.error("Registration failed. Please try again.");
            return false;
          } finally {
            set({ loading: false });
          }
        },

        signIn: async (email, password) => {
          try {
            set({ loading: true });
            const response = await authService.signIn({ email, password });

            if (!response.success) {
              toast.error(response.message || "Sign in failed");
              return false;
            }

            await get().getProfile();
            set({ checkAuthAttempts: 0 });
            toast.success("Welcome back! 🎉");
            return true;
          } catch (error) {
            console.error(error);
            toast.error("Sign in failed. Please check your credentials.");
            return false;
          } finally {
            set({ loading: false });
          }
        },

        signOut: async () => {
          try {
            await authService.signOut();
            get().clearState();
            toast.success("Signed out successfully!");
          } catch (error) {
            console.error(error);
            get().clearState();
            toast.error("Error during sign out.");
          }
        },

        getProfile: async () => {
          try {
            set({ loading: true });
            const response = await authService.getProfile();
            set({ user: response.data, isAuthenticated: true, loading: false, checkAuthAttempts: 0 });
          } catch (error) {
            console.error(error);
            set({ user: null, isAuthenticated: false, loading: false });
          }
        },

        checkAuth: async () => {
          const state = get();

          if (state.loading) {
            return;
          }

          if (state.isAuthenticated) {
            return;
          }

          const maxAttempts = 3;
          if (state.checkAuthAttempts >= maxAttempts) {
            return;
          }

          set({ loading: true, checkAuthAttempts: state.checkAuthAttempts + 1 });

          try {
            const response = await authService.checkSession();
            set({ user: response.data, isAuthenticated: true, loading: false, checkAuthAttempts: 0 });
          } catch {
            // Check session failed — try refresh then profile
            try {
              await authService.refresh();
              const response = await authService.getProfile();
              set({ user: response.data, isAuthenticated: true, loading: false, checkAuthAttempts: 0 });
            } catch {
              // Genuinely not authenticated
              set({ user: null, isAuthenticated: false, loading: false });
            }
          }
        },

        startSessionMonitor: () => {
          let lastVisibilityCheck = 0;

          const intervalId = setInterval(async () => {
            try {
              await apiClient.get("/auth/me");
            } catch {
              try {
                await apiClient.post("/auth/refresh");
              } catch {
                useAuthStore.getState().clearState();
                if (typeof window !== "undefined") {
                  window.location.href = "/login";
                }
              }
            }
          }, 4 * 60 * 1000);

          const handleVisibility = () => {
            if (document.visibilityState === "visible") {
              const now = Date.now();
              if (now - lastVisibilityCheck < 5000) return;
              lastVisibilityCheck = now;

              apiClient.get("/auth/me").catch(() => {
                apiClient.post("/auth/refresh").catch(() => {
                  useAuthStore.getState().clearState();
                  if (typeof window !== "undefined") {
                    window.location.href = "/login";
                  }
                });
              });
            }
          };

          document.addEventListener("visibilitychange", handleVisibility);

          return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibility);
          };
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
        }),
      }
    ),
    { name: "auth-store" }
  )
);

export { useAuthStore as useAuthStoreNew };
