import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  age?: number;
  gender?: string;
  language: string;
  interests: string[];
  isOnline: boolean;
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    SecureStore.setItemAsync('auth_token', token);
    set({ token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token });
      }
    } catch (e) {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },
}));
