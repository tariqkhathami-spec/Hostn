/**
 * Admin helpers — thin re-export layer.
 *
 * All in-memory state (activity logs, moderation maps, ban/suspend sets)
 * has been removed. State now lives in MongoDB via the Mongoose models:
 *   - ActivityLog  → persistent admin action log
 *   - Property.moderationStatus → moderation state
 *   - User.isBanned / User.isSuspended → ban/suspend state
 *
 * The requireAdmin helper in auth-helpers.ts is the canonical version.
 * This file is kept only for any legacy imports.
 */

export { requireAdmin } from './auth-helpers';
