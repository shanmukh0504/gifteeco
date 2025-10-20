import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// Get initial state from localStorage if it exists
const getInitialState = () => {
  try {
    const savedAuth = localStorage.getItem('auth-storage');
    if (savedAuth) {
      const { state } = JSON.parse(savedAuth);
      return {
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      };
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false
  };
};

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...getInitialState(),
      login: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;