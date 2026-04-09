export interface User {
  _id: string;
  phone: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role: 'guest' | 'host' | 'admin';
  nationalId?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  wishlist: string[];
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyImage {
  url: string;
  caption?: string;
  isPrimary: boolean;
  _id?: string;
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  type: 'apartment' | 'chalet' | 'villa' | 'studio' | 'farm' | 'camp' | 'resort' | 'hotel';
  images: PropertyImage[];
  videos?: string[];
  location: {
    city: string;
    district?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    isApproximate?: boolean;
    geoJSON?: { type: string; coordinates: number[] };
  };
  pricing: {
    perNight: number;
    cleaningFee: number;
    discountPercent: number;
    weeklyDiscount?: number;
  };
  capacity: {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    beds: number;
  };
  rules: {
    checkInTime: string;
    checkOutTime: string;
    minNights: number;
    maxNights: number;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
  };
  ratings: {
    average: number;
    count: number;
  };
  amenities: string[];
  area?: number;
  direction?: string;
  isActive: boolean;
  isApproved?: boolean;
  isFeatured: boolean;
  tags: string[];
  discountedPrice: number;
  bookedDates?: { start: string; end: string }[];
  unavailableDates?: { start: string; end: string }[];
  host: HostInfo;
  createdAt: string;
  updatedAt: string;
}

export interface HostInfo {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isVerified?: boolean;
  rating?: number;
  listingCount?: number;
  responseTime?: string;
  responseRate?: number;
  createdAt?: string;
}

export interface Booking {
  _id: string;
  property: Listing;
  guest: User;
  host: HostInfo;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  serviceFee: number;
  vat: number;
  securityDeposit?: number;
  discountAmount?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: string;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  booking: string;
  property: string;
  reviewer: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  property?: Listing;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  user: string;
  type: 'booking' | 'message' | 'payment' | 'promotion' | 'system';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface WalletInfo {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  description: string;
  reference?: string;
  createdAt: string;
}

export interface PaymentMethod {
  _id: string;
  type: 'card';
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

export interface PriceBreakdown {
  nightlyRate: number;
  nights: number;
  subtotal: number;
  weeklyDiscount?: number;
  serviceFee: number;
  vat: number;
  securityDeposit?: number;
  couponDiscount?: number;
  total: number;
}

export interface SearchParams {
  city?: string;
  type?: string;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  ratingMin?: number;
  hasDiscount?: boolean;
  district?: string;
  direction?: string;
  minArea?: number;
  maxArea?: number;
  hasPool?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface SupportTicket {
  _id: string;
  user: string;
  subject: string;
  category: 'payment' | 'booking' | 'complaint' | 'technical' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  _id: string;
  sender: 'user' | 'admin';
  text: string;
  createdAt: string;
}

export interface WishlistList {
  _id: string;
  name: string;
  user: string;
  properties: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
