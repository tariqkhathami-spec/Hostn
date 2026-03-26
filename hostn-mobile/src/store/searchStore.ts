import { create } from 'zustand';
import type { PropertyType } from '../types';

interface SearchState {
  destination: string | null;
  propertyTypes: PropertyType[];
  guests: { adults: number; children: number };
  dates: { checkIn: string | null; checkOut: string | null };
  filters: {
    minPrice?: number;
    maxPrice?: number;
    amenities: string[];
    sortBy: string;
  };

  setDestination: (city: string | null) => void;
  setPropertyTypes: (types: PropertyType[]) => void;
  togglePropertyType: (type: PropertyType) => void;
  setGuests: (guests: { adults: number; children: number }) => void;
  setDates: (dates: { checkIn: string | null; checkOut: string | null }) => void;
  setFilters: (filters: Partial<SearchState['filters']>) => void;
  reset: () => void;
}

const initialState = {
  destination: null,
  propertyTypes: [] as PropertyType[],
  guests: { adults: 1, children: 0 },
  dates: { checkIn: null, checkOut: null },
  filters: {
    amenities: [] as string[],
    sortBy: '-ratings.average',
  },
};

export const useSearchStore = create<SearchState>((set, get) => ({
  ...initialState,

  setDestination: (city) => set({ destination: city }),

  setPropertyTypes: (types) => set({ propertyTypes: types }),

  togglePropertyType: (type) => {
    const current = get().propertyTypes;
    const exists = current.includes(type);
    set({
      propertyTypes: exists
        ? current.filter((t) => t !== type)
        : [...current, type],
    });
  },

  setGuests: (guests) => set({ guests }),

  setDates: (dates) => set({ dates }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  reset: () => set(initialState),
}));
