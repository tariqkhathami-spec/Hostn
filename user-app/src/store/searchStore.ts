import { create } from 'zustand';

interface SearchState {
  city: string | null;
  cityName: string | null;
  propertyType: string | null;
  guests: number;
  checkIn: string | null;
  checkOut: string | null;

  setCity: (id: string, name: string) => void;
  setPropertyType: (type: string | null) => void;
  setGuests: (count: number) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  city: null,
  cityName: null,
  propertyType: null,
  guests: 1,
  checkIn: null,
  checkOut: null,

  setCity: (id, name) => set({ city: id, cityName: name }),
  setPropertyType: (type) => set({ propertyType: type }),
  setGuests: (count) => set({ guests: Math.max(1, count) }),
  setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
  reset: () =>
    set({
      city: null,
      cityName: null,
      propertyType: null,
      guests: 1,
      checkIn: null,
      checkOut: null,
    }),
}));
