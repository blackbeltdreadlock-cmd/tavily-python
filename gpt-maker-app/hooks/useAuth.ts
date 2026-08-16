import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (!store.initialized) {
      store.initialize();
    }
  }, [store.initialized]);

  return store;
}

export function useRequireAuth() {
  const { session, initialized } = useAuthStore();
  return { isAuthenticated: !!session, isLoading: !initialized };
}
