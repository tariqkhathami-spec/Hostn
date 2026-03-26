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

// ── Messaging Types ──
export interface ConversationLastMessage {
  content: string;
  sender: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Array<{ _id: string; name: string; avatar?: string }>;
  property?: { _id: string; title: string; images?: string[] };
  booking?: string;
  lastMessage?: ConversationLastMessage;
  unreadCount: Record<string, number>;
  blocked: { isBlocked: boolean; blockedBy?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: { _id: string; name: string; avatar?: string } | string;
  content: string;
  messageType: 'text' | 'system' | 'image';
  readBy: string[];
  createdAt: string;
}

// ── Support Ticket Types ──
export type TicketCategory = 'booking' | 'payment' | 'property' | 'account' | 'technical' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

export interface TicketMessage {
  sender: { _id: string; name: string; role: string };
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  user: { _id: string; name: string; email: string };
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  assignedTo?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ── Report Types ──
export type ReportTargetType = 'property' | 'user' | 'review';
export type ReportReason = 'inappropriate_content' | 'spam' | 'fraud' | 'harassment' | 'safety_concern' | 'misleading_listing' | 'discrimination' | 'property_damage' | 'policy_violation' | 'other';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type ReportAction = 'warning' | 'suspension' | 'listing_removed' | 'account_banned';

export interface Report {
  _id: string;
  reporter: { _id: string; name: string; email: string };
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  adminAction?: {
    action: ReportAction;
    note: string;
    takenBy: { _id: string; name: string };
    takenAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ── Notification Types ──
export type NotificationType = 'booking_created' | 'booking_confirmed' | 'booking_rejected' | 'booking_cancelled' | 'booking_completed' | 'payment_success' | 'payment_failed' | 'review_received' | 'listing_approved' | 'listing_rejected' | 'new_message' | 'support_reply' | 'report_update' | 'system';

export interface AppNotification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, string>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
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
