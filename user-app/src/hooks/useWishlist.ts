import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { wishlistsService } from '../services/wishlists.service';
import { useAuthStore } from '../store/authStore';
import { useRequireAuth } from './useRequireAuth';

/** react-query key holding the ids of every unit the guest has saved. */
export const WISHLIST_IDS_KEY = ['wishlistIds'] as const;

// The user object has no `wishlist` field. Saved units live in the guest's
// wishlist lists, so the ids are read from there once and kept in the
// react-query cache, which every screen with a heart shares.
async function fetchSavedUnitIds(): Promise<string[]> {
  const lists = await wishlistsService.getLists();
  const filled = lists.filter((l) => (l.unitCount ?? l.units?.length ?? 0) > 0);
  const details = await Promise.all(filled.map((l) => wishlistsService.getList(l._id).catch(() => null)));
  const ids = new Set<string>();
  details.forEach((list) => {
    (list?.units ?? []).forEach((u) => ids.add(String(typeof u === 'string' ? u : u._id)));
  });
  return [...ids];
}

export function useWishlist() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?._id);
  const requireAuth = useRequireAuth();
  // Per account, so one guest never sees another's hearts after a re-login.
  const key = [...WISHLIST_IDS_KEY, userId ?? 'me'];

  const { data: ids = [] } = useQuery({
    queryKey: key,
    queryFn: fetchSavedUnitIds,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const isFavorite = useCallback(
    (unitId?: string | null) => !!unitId && isAuthenticated && ids.includes(String(unitId)),
    [ids, isAuthenticated],
  );

  /** Add or remove a UNIT in the guest's default list. Only units can be saved. */
  const toggle = useCallback(
    async (unitId?: string | null) => {
      if (!unitId) return;
      if (!requireAuth()) return;
      const id = String(unitId);
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      // Show the change straight away, then settle on the server's answer.
      queryClient.setQueryData<string[]>(
        key,
        previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id],
      );
      try {
        const { wishlist } = await authService.toggleWishlist(id);
        const saved = wishlist.includes(id);
        queryClient.setQueryData<string[]>(key, (current = []) => {
          const without = current.filter((x) => x !== id);
          return saved ? [...without, id] : without;
        });
      } catch (err) {
        queryClient.setQueryData<string[]>(key, previous);
        if (__DEV__) console.debug('[wishlist] toggle failed:', err);
      } finally {
        // The unit may also sit in another list; re-read the truth.
        queryClient.invalidateQueries({ queryKey: WISHLIST_IDS_KEY });
        queryClient.invalidateQueries({ queryKey: ['wishlists'] });
        queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, requireAuth, userId],
  );

  return { ids, isFavorite, toggle };
}
