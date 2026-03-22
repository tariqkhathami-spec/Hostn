export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'guest' | 'host' | 'admin';
  isVerified: boolean;
  wishlist: string[];
  createdAt: string;
}

export interface PropertyImage {
  url: string;
  caption?: string;
  isPrimary: boolean;
}

export interface Location {
  city: string;
  district?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export interface Pricing {
  perNight: number;
  cleaningFee: number;
  discountPercent: number;
  weeklyDiscount?: number;
}

export interface Capacity {
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
}

export interface Rules {
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
}

export interface Ratings {
  average: number;
  count: number;
}

export type PropertyType = 'chalet' | 'apartment' | 'villa' | 'studio' | 'farm' | 'camp' | 'hotel';

export type AmenityType =
  | 'wifi'
  | 'pool'
  | 'parking'
  | 'ac'
  | 'kitchen'
  | 'tv'
  | 'washer'
  | 'dryer'
  | 'gym'
  | 'bbq'
  | 'garden'
  | 'balcony'
  | 'sea_view'
  | 'mountain_view'
  | 'elevator'
  | 'security'
  | 'pet_friendly'
  | 'smoking_allowed'
  | 'breakfast_included'
  | 'heating'
  | 'beach_access'
  | 'fireplace'
  | 'hot_tub';

export interface Property {
  _id: string;
  host: User | string;
  title: string;
  description: string;
  type: PropertyType;
  location: Location;
  images: PropertyImage[];
  amenities: AmenityType[];
  pricing: Pricing;
  capacity: Capacity;
  rules: Rules;
  ratings: Ratings;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  discountedPrice: number;
  createdAt: string;
}

export interface GuestCount {
  adults: number;
  children: number;
  infants: number;
}

export interface BookingPricing {
  perNight: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  discount: number;
  total: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';

export interface Booking {
  _id: string;
  property: Property | string;
  guest: User | string;
  checkIn: string;
  checkOut: string;
  guests: GuestCount;
  pricing: BookingPricing;
  status: BookingStatus;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  specialRequests?: string;
  createdAt: string;
}

export interface ReviewRatings {
  overall: number;
  cleanliness?: number;
  accuracy?: number;
  communication?: number;
  location?: number;
  value?: number;
}

export interface Review {
  _id: string;
  property: string | Property;
  guest: User;
  booking?: string;
  ratings: ReviewRatings;
  comment: string;
  hostResponse?: { comment: string; respondedAt: string };
  isVerified: boolean;
  createdAt: string;
}

export interface SearchFilters {
  city?: string;
  type?: PropertyType | '';
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
  user?: User;
}

// ─── Host Dashboard Types ─────────────────────────────────────────────────────

export interface HostDashboardStats {
  properties: { total: number; active: number; inactive: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  earnings: { total: number; monthly: number };
  reviews: { total: number; averageRating: number };
  occupancyRate: number;
}

export interface HostNotification {
  id: string;
  type: 'booking_pending' | 'review_new' | 'booking_confirmed';
  title: string;
  message: string;
  time: string;
  read: boolean;
  action: string;
}

export interface MonthlyEarning {
  month: number;
  monthName: string;
  earnings: number;
  bookings: number;
  avgPerBooking: number;
}

export interface EarningsData {
  year: number;
  totalEarnings: number;
  totalBookings: number;
  avgPerBooking: number;
  monthly: MonthlyEarning[];
  byType: Record<string, { earnings: number; bookings: number }>;
  topProperties: {
    propertyId: string;
    title: string;
    type: string;
    earnings: number;
    bookings: number;
  }[];
}

export interface CalendarBooking {
  _id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guest: { name: string; email: string };
  total: number;
}

export interface CalendarData {
  propertyId: string;
  propertyTitle: string;
  bookings: CalendarBooking[];
  blockedDates: { start: string; end: string }[];
}

export interface ReviewSummary {
  total: number;
  averageRating: number;
  distribution: Record<number, number>;
  subRatings: {
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    value: number;
  };
}

export interface UnavailableDate {
  start: string;
  end: string;
}
