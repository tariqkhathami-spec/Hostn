import { create } from 'zustand';

interface SearchState {
  city: string | null;
  cityName: string | null;
  propertyType: string | null;
  guests: number;
  adults: number;
  children: number;
  checkIn: string | null;
  checkOut: string | null;

  // Advanced filters
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  ratingMin: number | null;
  hasDiscount: boolean;
  district: string | null;
  direction: string | null;
  minArea: number | null;
  maxArea: number | null;

  setCity: (id: string, name: string) => void;
  setPropertyType: (type: string | null) => void;
  setGuests: (count: number) => void;
  setAdults: (count: number) => void;
  setChildren: (count: number) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setMinPrice: (price: number | null) => void;
  setMaxPrice: (price: number | null) => void;
  setBedrooms: (count: number) => void;
  setBathrooms: (count: number) => void;
  setAmenities: (amenities: string[]) => void;
  setRatingMin: (rating: number | null) => void;
  setHasDiscount: (value: boolean) => void;
  setDistrict: (district: string | null) => void;
  setDirection: (direction: string | null) => void;
  setMinArea: (area: number | null) => void;
  setMaxArea: (area: number | null) => void;
  resetFilters: () => void;
  reset: () => void;
}

const defaultFilters = {
  minPrice: null,
  maxPrice: null,
  bedrooms: 0,
  bathrooms: 0,
  amenities: [] as string[],
  ratingMin: null,
  hasDiscount: false,
  district: null,
  direction: null,
  minArea: null,
  maxArea: null,
};

export const useSearchStore = create<SearchState>((set) => ({
  city: null,
  cityName: null,
  propertyType: null,
  guests: 1,
  adults: 1,
  children: 0,
  checkIn: null,
  checkOut: null,
  ...defaultFilters,

  setCity: (id, name) => set({ city: id, cityName: name }),
  setPropertyType: (type) => set({ propertyType: type }),
  setGuests: (count) => set({ guests: Math.max(1, count) }),
  setAdults: (count) => set((state) => {
    const newAdults = Math.max(1, count);
    return { adults: newAdults, guests: newAdults + state.children };
  }),
  setChildren: (count) => set((state) => {
    const newChildren = Math.max(0, count);
    return { children: newChildren, guests: state.adults + newChildren };
  }),
  setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
  setMinPrice: (price) => set({ minPrice: price }),
  setMaxPrice: (price) => set({ maxPrice: price }),
  setBedrooms: (count) => set({ bedrooms: count }),
  setBathrooms: (count) => set({ bathrooms: count }),
  setAmenities: (amenities) => set({ amenities }),
  setRatingMin: (rating) => set({ ratingMin: rating }),
  setHasDiscount: (value) => set({ hasDiscount: value }),
  setDistrict: (district) => set({ district }),
  setDirection: (direction) => set({ direction }),
  setMinArea: (area) => set({ minArea: area }),
  setMaxArea: (area) => set({ maxArea: area }),
  resetFilters: () => set({ propertyType: null, ...defaultFilters }),
  reset: () =>
    set({
      city: null,
      cityName: null,
      propertyType: null,
      guests: 1,
      adults: 1,
      children: 0,
      checkIn: null,
      checkOut: null,
      ...defaultFilters,
    }),
}));
