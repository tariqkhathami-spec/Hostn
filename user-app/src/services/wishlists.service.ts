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

  addProperty(listId: string, propertyId: string) {
    return api
      .post(`/wishlists/${listId}/properties`, { propertyId })
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as WishlistList;
      });
  },

  removeProperty(listId: string, propertyId: string) {
    return api
      .delete(`/wishlists/${listId}/properties/${propertyId}`)
      .then((r) => r.data);
  },
};
