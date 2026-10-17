import { create } from "zustand";
import {
  auth,
  getStoredUser,
  isAuthenticated,
  onAuthExpired,
} from "../services/api";

export const useAuthStore = create((set) => ({
  user: isAuthenticated() ? getStoredUser() : null,
  initializing: isAuthenticated(),

  login: async (credentials) => {
    const user = await auth.login(credentials);
    set({ user });
    return user;
  },

  logout: async () => {
    await auth.logout();
    set({ user: null });
  },

  setUser: (user) => set({ user }),

  // Run once on app start: confirm the stored session is still valid.
  bootstrap: async () => {
    if (!isAuthenticated()) {
      set({ user: null, initializing: false });
      return;
    }
    try {
      const user = await auth.getCurrentUser();
      set({ user, initializing: false });
    } catch (err) {
      // 401 means the session is dead; anything else (e.g. offline) keeps the stored user.
      set({
        user: err.status === 401 ? null : getStoredUser(),
        initializing: false,
      });
    }
  },
}));

// api.js fires this when a refresh fails, so the UI signs out immediately.
onAuthExpired(() => useAuthStore.setState({ user: null }));