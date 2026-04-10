export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'guest' | 'host' | 'admin';
  adminRole?: 'super' | 'support' | 'finance' | null;
  isVerified: boolean;
  wishlist: string[];
  balance?: number;
  blockedByHosts?: number;
  guestRating?: number;
  createdAt: string;
}

export interface WishlistList {
  _id: string;
  name: string;
  isDefault: boolean;
  propertyCount: number;
  coverImage: string | null;
  properties?: Property[];
  createdAt: string;
  updatedAt: string;
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
  titleAr?: string;
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
  bookedDates?: { start: string; end: string }[];
  area?: number;
  direction?: string;
  activeUnitCount?: number;
  createdAt: string;
}

// ─── Unit Types ─────────────────────────────────────────────────────────────

export interface UnitPool {
  _id?: string;
  type: string;
  variableDepth?: boolean;
  depthMin?: number;
  depthMax?: number;
  depth?: number;
  lengthM?: number;
  widthM?: number;
}

export interface Unit {
  _id: string;
  property: Property | string;
  isActive: boolean;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  area?: number;
  suitability?: string;
  depositPercent?: number;
  insuranceOnArrival?: boolean;
  insuranceAmount?: number;
  writtenRules?: string;
  cancellationPolicy?: string;
  cancellationDescription?: string;
  hasLivingRooms?: boolean;
  livingRooms?: { main?: number; additional?: number; outdoor?: number; outdoorRoom?: number };
  hasBedrooms?: boolean;
  bedrooms?: { count?: number; singleBeds?: number; doubleBeds?: number };
  bathroomCount?: number;
  bathroomAmenities?: string[];
  hasKitchen?: boolean;
  kitchen?: { diningCapacity?: number; amenities?: string[] };
  hasPool?: boolean;
  pools?: UnitPool[];
  amenities?: string[];
  features?: string[];
  images?: { url: string; caption?: string; isPrimary?: boolean }[];
  pricing?: Record<string, number>;
  capacity?: { maxGuests?: number };
  ratings?: Ratings;
  unavailableDates?: { start: string; end: string }[];
  datePricing?: { date: string; price?: number; isBlocked?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
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

export type BookingStatus = 'held' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';

export interface BookingUnit {
  _id: string;
  nameEn: string;
  nameAr: string;
  images?: { url: string; caption?: string; isPrimary?: boolean }[];
  capacity?: { maxGuests: number; bedrooms: number; bathrooms: number };
  pricing?: Record<string, number>;
}

export interface Booking {
  _id: string;
  property: Property | string;
  unit?: BookingUnit | string | null;
  guest: User | string;
  checkIn: string;
  checkOut: string;
  guests: GuestCount;
  pricing: BookingPricing;
  status: BookingStatus;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  specialRequests?: string;
  holdExpiresAt?: string;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  _id: string;
  booking: Booking | string;
  user: User | string;
  property: Property | string;
  amount: number;
  currency: string;
  provider: 'moyasar' | 'stripe' | 'manual';
  providerPaymentId?: string;
  providerStatus?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  fees: {
    platformFee: number;
    providerFee: number;
    hostPayout: number;
  };
  refundedAmount: number;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
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

// ─── Report & Support Types ──────────────────────────────────────────────────

export type ReportTargetType = 'property' | 'user' | 'review';
export type ReportReason = 'inappropriate_content' | 'spam' | 'harassment' | 'fraud' | 'safety_concern' | 'misleading_listing' | 'discrimination' | 'property_damage' | 'noise_violation' | 'cancellation_abuse' | 'policy_violation' | 'other';
export type ReportAction = 'none' | 'warning' | 'suspension' | 'listing_removed' | 'account_banned';

export interface Report {
  _id: string;
  reporter: User | string;
  targetType: 'property' | 'user' | 'review';
  targetId: string;
  reason: string;
  description: string;
  relatedBooking?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminNotes?: string;
  actionTaken?: ReportAction;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketCategory = 'payment' | 'booking' | 'complaint' | 'technical' | 'account' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface TicketMessage {
  _id: string;
  sender: User | string;
  senderRole: 'user' | 'admin';
  content: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  user: User | string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  assignedTo?: string;
  relatedBooking?: string;
  relatedProperty?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Messaging Types ─────────────────────────────────────────────────────────

export interface Message {
  _id: string;
  conversation: string;
  sender: User | string;
  content: string;
  messageType: 'text' | 'system' | 'booking_update';
  readBy: { user: string; readAt: string }[];
  isDeleted: boolean;
  metadata?: { bookingId?: string; propertyId?: string };
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  booking?: string;
  property?: Property | string;
  lastMessage: { content: string; sender: string; timestamp: string };
  unreadCount: Record<string, number>;
  isBlocked: boolean;
  blockedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification Types ──────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
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

// ─── Admin Dashboard Types ──────────────────────────────────────────────────────

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface AdminDashboardStats {
  totalUsers: number;
  totalHosts: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  pendingProperties: number;
  recentActivity: AdminActivityLog[];
}

export interface AdminActivityLog {
  _id: string;
  action: 'property_approved' | 'property_rejected' | 'user_banned' | 'user_unbanned' | 'booking_cancelled' | 'host_suspended' | 'host_activated' | 'property_created' | 'booking_created' | 'review_created';
  performedBy: string;
  targetType: 'user' | 'property' | 'booking' | 'review';
  targetId: string;
  details: string;
  createdAt: string;
}

export interface AdminUser extends User {
  isBanned?: boolean;
  bookingsCount?: number;
  totalSpent?: number;
}

export interface AdminProperty extends Property {
  moderationStatus: ModerationStatus;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface AdminBooking extends Booking {
  hostName?: string;
  guestName?: string;
  propertyTitle?: string;
}

export interface PaymentRecord {
  _id: string;
  bookingId: string;
  guestName: string;
  guestEmail?: string;
  propertyTitle: string;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  fees?: {
    platformFee: number;
    providerFee: number;
    hostPayout: number;
  };
  bookingStatus: string;
  createdAt: string;
  paidAt?: string;
}

// ═══ Blog ═══
export interface BlogCategory {
  _id: string;
  name: { en: string; ar: string };
  slug: string;
}

export interface BlogPost {
  _id: string;
  title: { en: string; ar: string };
  slug: string;
  excerpt: { en: string; ar: string };
  content: { en: string; ar: string };
  coverImage?: string;
  category: BlogCategory | string;
  author: User | string;
  tags?: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
