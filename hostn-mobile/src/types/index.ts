// ─── Core Types (adapted from frontend/src/types/index.ts) ──────────────────

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneVerified?: boolean;
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
  | 'wifi' | 'pool' | 'parking' | 'ac' | 'kitchen' | 'tv'
  | 'washer' | 'dryer' | 'gym' | 'bbq' | 'garden' | 'balcony'
  | 'sea_view' | 'mountain_view' | 'elevator' | 'security'
  | 'pet_friendly' | 'smoking_allowed' | 'breakfast_included'
  | 'heating' | 'beach_access' | 'fireplace' | 'hot_tub';

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

// ─── Mobile-Specific Types ──────────────────────────────────────────────────

export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  image: any; // require() image
}

export interface OTPPayload {
  phone: string;
  countryCode: string;
  otp: string;
}

export interface SearchParams {
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  amenities?: string;
  page?: number;
  limit?: number;
  sort?: string;
  featured?: string;
  search?: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  booking?: string;
  property?: Property | string;
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
  };
  unreadCount: number;
  isBlocked: boolean;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string | User;
  content: string;
  messageType: 'text' | 'system' | 'booking_update';
  readBy: string[];
  isDeleted: boolean;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  category: 'refund' | 'promotional_credit' | 'booking_charge' | 'withdrawal' | 'cashback';
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface SavedPaymentMethod {
  _id: string;
  provider: 'moyasar' | 'stripe';
  cardBrand: 'visa' | 'mastercard' | 'mada' | 'amex';
  cardLast4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  nickname?: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface HomeFeedData {
  featured: Property[];
  cities: string[];
  categories: {
    luxury: Property[];
    families: Property[];
    business: Property[];
    topRated: Property[];
  };
}

export interface CouponValidation {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
}
