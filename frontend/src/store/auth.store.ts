import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Campus = 'VELLORE' | 'CHENNAI' | 'AP' | 'BHOPAL';
export type Role = 'STUDENT' | 'EXTERNAL' | 'CLUB_PRESIDENT' | 'FACULTY' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  campus?: Campus;
  role: Role;
  avatar?: string;
  points: number;
  regNumber?: string;
  department?: string;
  year?: number | string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'vitverse-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
