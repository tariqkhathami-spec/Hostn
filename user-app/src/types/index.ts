export interface User {
  _id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role: 'guest' | 'host' | 'admin';
  nationalId?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  wishlist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  type: 'apartment' | 'chalet' | 'farm' | 'camp' | 'resort';
  images: string[];
  videos?: string[];
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  currency: string;
  city: string;
  district?: string;
  address?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area?: number;
  amenities: string[];
  rating: number;
  reviewCount: number;
  host: HostInfo;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: string;
  houseRules?: string[];
  isAvailable: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface HostInfo {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rating?: number;
  listingCount?: number;
  responseTime?: string;
  responseRate?: number;
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
    firstName: string;
    lastName: string;
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
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
