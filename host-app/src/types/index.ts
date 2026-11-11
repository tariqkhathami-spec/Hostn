// Property = container + stay rules. Bookable fields (pricing, capacity, rooms,
// amenities, images) live on Unit, NOT on Property — see /property/edit/[id].tsx
// and the Phase 8 calendar spec at audit/gathern_calendar_feature_spec.md §4.
//
// Field shape varies between endpoints:
//  - GET /host/properties (list)  uses name/nameAr + address.{city,…} + flat location.{lat,lng}
//  - GET /properties/:id (detail) uses title/titleAr + location.{city,district,coordinates} + host
// Both shapes are declared as optional below so consumers can read either.
export interface PropertyRules {
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
}

export interface Property {
  id: string;
  _id?: string;
  name: string;
  nameAr: string;
  title?: string;
  titleAr?: string;
  type?: string;
  direction?: string;
  classification: string;
  status: 'listed' | 'unlisted';
  units: Unit[];
  unitCount: number;
  activeUnitCount?: number;
  address?: {
    city: string;
    street: string;
    direction: string;
    coordinates: { lat: number; lng: number };
  };
  location?: {
    city?: string;
    district?: string;
    lat?: number;
    lng?: number;
    coordinates?: { lat: number; lng: number };
  };
  rules?: PropertyRules;
  host?: { _id: string; name?: string };
  createdAt: string;
}

// Unit = bookable resource. Backend (`GET /units/:id`) returns:
//   nameEn / nameAr (and a virtual `name` aliasing nameAr)
//   bedrooms: { count, singleBeds, doubleBeds }   ← top-level structured rooms
//   bathroomCount: number                          ← top-level scalar
//   capacity: { maxGuests }                        ← ONLY maxGuests
//   pricing: { sunday..saturday, cleaningFee, discountPercent, …LOS flags }
//   livingRooms / kitchen / pools / amenities[] / features[] / images[{url,isPrimary}]
// Keys NOT on the backend Unit (verified via curl): rooms, rules, type, location, description, perNight.
// PUT /units/:id silently discards unknown keys, which is why the pre-fix edit
// screen appeared to save but lost most of the form. See DD-host-4.
export interface Unit {
  id: string;
  _id?: string;
  propertyId?: string;
  property?: string | { _id: string };

  // Names
  nameEn?: string;
  nameAr?: string;
  name?: string;            // virtual; usually aliases nameAr server-side

  code?: string;
  status?: 'listed' | 'unlisted';
  isActive?: boolean;

  // Capacity / rooms (real shape)
  capacity?: { maxGuests?: number };
  bedrooms?: { count?: number; singleBeds?: number; doubleBeds?: number };
  bathroomCount?: number;
  bathroomAmenities?: string[];
  livingRooms?: { main?: number; additional?: number; outdoor?: number; outdoorRoom?: number };
  kitchen?: { diningCapacity?: number; amenities?: string[] };
  hasBedrooms?: boolean;
  hasKitchen?: boolean;
  hasLivingRooms?: boolean;
  hasPool?: boolean;
  pools?: unknown[];

  // Other unit-level fields
  area?: number;
  occupancyPercent?: number;
  suitability?: 'families_and_singles' | 'families_only' | 'singles_only' | 'singles' | 'families' | string;
  deposit?: number;
  depositPercent?: number;
  securityDeposit?: number;
  insuranceAmount?: number;
  insuranceOnArrival?: boolean;
  cancellationPolicy?: string;
  description?: string;
  arrivalInstructions?: string;
  writtenRules?: string;

  amenities?: string[];
  features?: string[];

  images?: Array<{ url: string; isPrimary?: boolean; _id?: string; id?: string } | string>;
  photos?: string[];

  pricing?: UnitPricing;

  video?: { url?: string; thumbnail?: string };
  tourismLicense?: {
    licenseNumber?: string;
    licenseType?: 'tourism_permit' | string;
    issueDate?: string;
    expiryDate?: string;
    status?: 'active' | 'expired' | 'pending' | string;
  };
}

// Unit pricing per backend: per-DOW rates (no `perNight` or `midWeek`).
// `midWeek` kept as an optional alias since some legacy callers reference it.
export interface UnitPricing {
  sunday?: number;
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  midWeek?: number;             // legacy alias, not on backend
  cleaningFee?: number;
  discountPercent?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  globalEnabled?: boolean;
  globalStackable?: boolean;
  weeklyEnabled?: boolean;
  weeklyStackable?: boolean;
  monthlyEnabled?: boolean;
  monthlyStackable?: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  reference?: string; // e.g., "HB-ABC12345" — human-readable booking reference
  guestName: string;
  guestPhone: string;
  propertyName: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  hostAmount: number;
  status: 'pending' | 'confirmed' | 'in_payment' | 'waiting' | 'cancelled' | 'no_show' | 'completed' | 'rejected' | 'held';
  createdAt: string;
  invoice?: { _id: string; invoiceNumber: string } | null;
}

export interface Review {
  id: string;
  guestName: string;
  guestAvatar?: string;
  bookingId: string;
  unitName: string;
  overallRating: number;
  cleanliness: number;
  condition: number;
  information: number;
  service: number;
  comment: string;
  hostReply?: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  transactionId: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  method: 'bank' | 'stc_pay';
  accountNumber: string;
  requestDate: string;
  completionDate?: string;
  bookings: string[];
}

export interface Notification {
  id: string;
  type: 'booking_confirmed' | 'check_in' | 'check_out' | 'nps_survey' | 'platform_update';
  title: string;
  body: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  views: number;
  clicks: number;
  conversionRate: number;
  sales: number;
  totalBookings: number;
  confirmedBookings: number;
  ratings: {
    count: number;
    overall: number;
    cleanliness: number;
    condition: number;
    information: number;
    service: number;
  };
  points: {
    total: number;
    max: number;
    rating: number;
    responseRate: number;
    responseSpeed: number;
    conversionRate: number;
    complaints: number;
  };
  conversations: {
    total: number;
    replied: number;
    responseRate: number;
    avgResponseTime: string;
  };
  complaints: number;
}

export interface CalendarUnit {
  unitId: string;
  unitName: string;
  unitCode: string;
  isListed: boolean;
  bookedDates: string[];
  blockedDates?: string[];
  discountRules?: { type: 'weekday' | 'weekend'; percent: number; enabled?: boolean }[];
  datePricing?: { date: string; price?: number; isBlocked?: boolean; discountPercent?: number }[];
}

export interface CalendarProperty {
  propertyId: string;
  propertyName: string;
  units: CalendarUnit[];
}

export interface AmbassadorTier {
  level: 'basic' | 'silver' | 'gold' | 'peak';
  nameAr: string;
  nameEn: string;
  cashbackPercent: number;
  bonusPoints: number;
  benefits: string[];
}

export interface Conversation {
  id: string;
  guestId: string;
  guestName: string;
  unitId: string;
  unitName: string;
  unitThumbnail?: string;
  lastMessage: string;
  lastMessageDate: string;
  isUnread: boolean;
  bookingStatus?: string;
  reservationId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sender: 'host' | 'guest' | 'support';
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
}

export interface UnitDiscount {
  type: 'weekly' | 'monthly';
  percentage: number;
  active: boolean;
  averagePrice?: number;
}

export interface CustomOffer {
  id: string;
  name: string;
  discountPercent: number;
  selectedDates: string[];
  discountedPrices: { date: string; originalPrice: number; discountedPrice: number }[];
  active: boolean;
  createdAt: string;
}

export interface PaymentMethod {
  type: 'bank_transfer' | 'stc_pay';
  iban?: string;
  bankName?: string;
  accountHolder?: string;
  stcPayNumber?: string;
  stcPayFee?: number;
}

export interface TransferDuration {
  type: 'direct_48h' | 'threshold' | 'weekly';
  thresholdAmount?: number;
}

export interface TransferDetail extends Transfer {
  reservations: {
    reservationId: string;
    guestName: string;
    amount: number;
    unitName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
  }[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  vendorName: string;
  vendorTaxNumber?: string;
  buyerName: string;
  unitName: string;
  unitCode: string;
  city: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  lineItems: { description: string; quantity: number; unitPrice: number; taxRate: number; taxAmount: number; total: number }[];
  taxableAmount: number;
  vatAmount: number;
  totalWithTax: number;
  qrCodeData?: string;
}

export interface Statement {
  id: string;
  month: string;
  year: number;
  openingBalance: number;
  closingBalance: number;
  transactions: { date: string; description: string; credit: number; debit: number; balance: number }[];
}

export interface AccountSummary {
  period: string;
  propertyId?: string;
  unitId?: string;
  totalRevenue: number;
  totalBookings: number;
  averageNightRate: number;
  occupancyRate: number;
  data: Record<string, unknown>;
}

export interface AmbassadorIndicators {
  confirmedNights: { value: number; thresholds: number[] };
  averageRating: { value: number; thresholds: number[] };
  unitAvailability: { value: number; thresholds: number[] };
  guestReviewPercent: { value: number; thresholds: number[] };
  hostReviewPercent: { value: number; thresholds: number[] };
  cancelledBookings: { value: number; thresholds: number[] };
}

export interface AmbassadorComparison {
  tiers: { name: string; nameAr: string; requirements: Record<string, string>; benefits: string[] }[];
}

export interface AmbassadorFaq {
  items: { question: string; answer: string }[];
}

export interface ReservationManager {
  id: string;
  name: string;
  phone: string;
  smsEnabled: boolean;
  isOwner: boolean;
  status: 'active' | 'inactive';
}

export interface BookingRule {
  id: string;
  applyToAll: boolean;
  unitId?: string;
  unitName?: string;
  minNights: number;
}

export interface VatEntry {
  id: string;
  propertyId: string;
  propertyName: string;
  taxNumber: string;
  verified: boolean;
}

export interface UnitPermit {
  unitId: string;
  unitName: string;
  location: string;
  thumbnailUrl?: string;
  permitStatus: 'none' | 'pending' | 'approved' | 'rejected';
  permitNumber?: string;
  permitDocumentUrl?: string;
  rejectionReason?: string;
}

export interface ProtectionProgram {
  active: boolean;
  claimsThisYear: number;
  maxClaimsPerYear: number;
  totalCompensated: number;
  maxCompensationPerYear: number;
  maxPerClaim: number;
}

export interface Claim {
  id: string;
  reservationId: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  amountRequested: number;
  evidenceUrls: string[];
  submittedAt: string;
}

export interface Suggestion {
  id: string;
  hostName: string;
  text: string;
  createdAt: string;
  votes: { important: number; moderate: number; notImportant: number };
  percentages: { important: number; moderate: number; notImportant: number };
  currentUserVote?: 'important' | 'moderate' | 'not_important';
  platformResponse?: string;
  status: 'open' | 'under_review' | 'implemented' | 'declined';
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedDate: string;
  url: string;
  thumbnailUrl?: string;
}

export interface ChangeRequest {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  propertyName: string;
  unitName?: string;
  createdAt: string;
  description?: string;
}

export interface ReferralLink {
  id: string;
  url: string;
  clicks: number;
  bookings: number;
}

export interface DiscountCode {
  id: string;
  code: string;
  discountPercent: number;
  usageCount: number;
  active: boolean;
  createdAt: string;
}

export interface TermsOfUse {
  signed: boolean;
  signedDate?: string;
  version: string;
  articles: { number: number; title: string; content: string }[];
}

export interface SupportInfo {
  hoursStart: string;
  hoursEnd: string;
  days: string;
  phone: string;
}
