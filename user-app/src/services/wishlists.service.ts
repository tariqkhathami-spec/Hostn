import api from './api';
import type { WishlistList } from '../types';

export const wishlistsService = {
  getLists() {
    return api.get('/wishlists').then((r) => {
      const d = r.data as any;
      return (d.data ?? d) as WishlistList[];
    });
  },

  getList(id: string) {
    return api.get(`/wishlists/${id}`).then((r) => {
      const d = r.data as any;
      return (d.data ?? d) as WishlistList;
    });
  },

  createList(name: string) {
    return api.post('/wishlists', { name }).then((r) => {
      const d = r.data as any;
      return (d.data ?? d) as WishlistList;
    });
  },

  renameList(id: string, name: string) {
    return api.put(`/wishlists/${id}`, { name }).then((r) => {
      const d = r.data as any;
      return (d.data ?? d) as WishlistList;
    });
  },

  deleteList(id: string) {
    return api.delete(`/wishlists/${id}`).then((r) => r.data);
  },

  toggleUnit(listId: string, unitId: string) {
    return api
      .post(`/wishlists/${listId}/units/${unitId}`)
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as WishlistList;
      });
  },

  addUnit(listId: string, unitId: string) {
    return api
      .post(`/wishlists/${listId}/units/${unitId}`)
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as WishlistList;
      });
  },

  removeUnit(listId: string, unitId: string) {
    return api
      .post(`/wishlists/${listId}/units/${unitId}`)
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as WishlistList;
      });
  },

  moveUnit(unitId: string, fromListId: string, toListId: string) {
    return api
      .put(`/wishlists/move`, { unitId, fromListId, toListId })
      .then((r) => r.data);
  },

  getUnitMembership(unitId: string) {
    return api
      .get(`/wishlists/unit/${unitId}/membership`)
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as { _id: string; units: string[] }[];
      });
  },
};
