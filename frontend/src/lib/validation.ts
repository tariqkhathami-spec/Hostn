import { z } from 'zod';

/**
 * Centralized Zod validation schemas for all API endpoints.
 * Ensures all user input is validated before processing.
 */

// ── Auth Schemas ──

export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email')
    .max(255, 'Email is too long')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  phone: z.string()
    .max(20, 'Phone number is too long')
    .regex(/^[+\d\s()-]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  role: z.enum(['guest', 'host'], {
    errorMap: () => ({ message: 'Invalid role. Only guest or host allowed.' }),
  }).default('guest'),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128),
});

export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Please enter a valid email')
    .max(255)
    .trim()
    .toLowerCase(),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const profileUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  phone: z.string()
    .max(20)
    .regex(/^[+\d\s()-]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  avatar: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

// ── Booking Schemas ──

export const bookingSchema = z.object({
  propertyId: z.string()
    .min(1, 'Property ID is required')
    .regex(/^[a-f\d]{24}$/i, 'Invalid property ID format'),
  checkIn: z.string()
    .min(1, 'Check-in date is required')
    .refine((d) => !isNaN(new Date(d).getTime()), 'Invalid check-in date'),
  checkOut: z.string()
    .min(1, 'Check-out date is required')
    .refine((d) => !isNaN(new Date(d).getTime()), 'Invalid check-out date'),
  guests: z.object({
    adults: z.number().int().min(1, 'At least 1 adult required').max(50),
    children: z.number().int().min(0).max(50).default(0),
    infants: z.number().int().min(0).max(10).default(0),
  }).default({ adults: 1, children: 0, infants: 0 }),
  specialRequests: z.string()
    .max(500, 'Special requests cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  // NOTE: discount and cleaningFee are intentionally NOT accepted from client
  // All pricing is calculated server-side from property database records
});

// ── Payment Schemas ──

export const initiatePaymentSchema = z.object({
  bookingId: z.string()
    .min(1, 'Booking ID is required')
    .regex(/^[a-f\d]{24}$/i, 'Invalid booking ID format'),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string()
    .min(1, 'Payment ID is required')
    .regex(/^[a-f\d]{24}$/i, 'Invalid payment ID format'),
  moyasarPaymentId: z.string()
    .min(1, 'Moyasar payment ID is required')
    .max(100),
});

// ── Property Schemas ──

const validPropertyTypes = ['chalet', 'apartment', 'villa', 'studio', 'farm', 'camp', 'hotel'] as const;
const validAmenities = ['wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'washer', 'dryer', 'heating', 'workspace', 'gym', 'hot_tub', 'bbq', 'garden', 'security', 'elevator', 'balcony', 'sea_view', 'mountain_view', 'playground'] as const;

export const createPropertySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .default(''),
  type: z.enum(validPropertyTypes, {
    errorMap: () => ({ message: 'Invalid property type' }),
  }),
  city: z.string()
    .min(1, 'City is required')
    .max(100)
    .trim(),
  district: z.string().max(100).trim().optional().default(''),
  address: z.string().max(300).trim().optional().default(''),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    caption: z.string().max(200).optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  amenities: z.array(z.string().max(50)).max(30).optional(),
  perNight: z.number()
    .min(1, 'Price per night must be at least 1')
    .max(100000, 'Price per night cannot exceed 100,000'),
  cleaningFee: z.number().min(0).max(10000).default(0),
  maxGuests: z.number().int().min(1).max(100).default(4),
  bedrooms: z.number().int().min(0).max(50).default(1),
  bathrooms: z.number().int().min(0).max(50).default(1),
  beds: z.number().int().min(0).max(100).default(1),
  rules: z.object({
    minNights: z.number().int().min(1).max(365).default(1),
    maxNights: z.number().int().min(1).max(365).default(30),
    checkInTime: z.string().regex(/^\d{2}:\d{2}$/).default('14:00'),
    checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).default('12:00'),
    smokingAllowed: z.boolean().default(false),
    petsAllowed: z.boolean().default(false),
    partiesAllowed: z.boolean().default(false),
  }).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ── Review Schemas ──

export const createReviewSchema = z.object({
  propertyId: z.string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid property ID'),
  bookingId: z.string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid booking ID'),
  rating: z.number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z.string()
    .min(1, 'Comment is required')
    .max(2000, 'Comment cannot exceed 2000 characters')
    .trim(),
});

// ── Admin Schemas ──

export const adminUserActionSchema = z.object({
  action: z.enum(['ban', 'unban', 'suspend', 'activate'], {
    errorMap: () => ({ message: 'Invalid action' }),
  }),
  reason: z.string().max(500).optional(),
});

export const moderatePropertySchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' }),
  }),
  reason: z.string()
    .max(500)
    .optional()
    .refine((val) => val !== undefined, {
      message: 'Reason is required for rejection',
    }),
});

// ── Webhook Schema ──

export const webhookPayloadSchema = z.object({
  id: z.string().optional(),
  payment_id: z.string().optional(),
  status: z.string().optional(),
}).passthrough().refine(
  (data) => data.id || data.payment_id,
  { message: 'Missing payment ID in webhook payload' }
);

// ── Search/Query Schemas ──

export const propertySearchSchema = z.object({
  city: z.string().max(100).trim().optional(),
  type: z.enum(validPropertyTypes).optional(),
  featured: z.enum(['true', 'false']).optional(),
  minPrice: z.string().regex(/^\d+$/).optional(),
  maxPrice: z.string().regex(/^\d+$/).optional(),
  guests: z.string().regex(/^\d+$/).optional(),
  search: z.string().max(200).trim().optional(),
  sort: z.enum(['rating', 'price_asc', 'price_desc', 'newest']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
