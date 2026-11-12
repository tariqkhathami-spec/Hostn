import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useAuthStore } from '../store/authStore';

/**
 * Guests can browse freely; actions that need an account call this first.
 *
 *   const requireAuth = useRequireAuth();
 *   if (!requireAuth()) return;            // sent to sign-in, comes back here
 *   if (!requireAuth('/checkout/123')) return; // sent to sign-in, then on to checkout
 *
 * Returns true when the visitor is signed in and the action may continue.
 */
export function useRequireAuth() {
  const router = useRouter();
  return useCallback(
    (returnTo?: Href) => {
      const { isAuthenticated, setReturnTo } = useAuthStore.getState();
      if (isAuthenticated) return true;
      setReturnTo(returnTo ?? null);
      router.push('/(auth)/phone');
      return false;
    },
    [router],
  );
}
