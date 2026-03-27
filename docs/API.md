# Hostn API Reference

Base URL: `/api/v1`

## Authentication

All protected routes require `Authorization: Bearer <token>` header or `hostn_token` HttpOnly cookie.

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register new user (rate-limited: 5/hr) |
| POST | `/login` | No | Login (rate-limited: 10/15min) |
| POST | `/refresh` | No | Refresh access token |
| POST | `/logout` | Yes | Logout single session |
| POST | `/logout-all` | Yes | Logout all devices |
| GET | `/me` | Yes | Get current user profile |
| PUT | `/profile` | Yes | Update profile |
| PUT | `/change-password` | Yes | Change password |
| PUT | `/upgrade-to-host` | Yes | Upgrade guest to host role |
| POST | `/wishlist/:propertyId` | Yes | Toggle property wishlist |
| POST | `/send-otp` | No | Send phone verification OTP |
| POST | `/verify-otp` | No | Verify OTP code |

### Properties (`/api/v1/properties`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Search/filter properties |
| GET | `/home-feed` | No | Featured properties for homepage |
| GET | `/cities` | No | List available cities |
| GET | `/my-properties` | Yes (host) | Host's own properties |
| GET | `/:id` | No | Get single property |
| GET | `/:id/availability` | No | Check date availability |
| POST | `/` | Yes (host/admin) | Create property |
| PUT | `/:id` | Yes (host/admin) | Update property |
| DELETE | `/:id` | Yes (host/admin) | Delete property |

### Bookings (`/api/v1/bookings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create booking |
| GET | `/my-bookings` | Yes | Guest's bookings |
| GET | `/host-bookings` | Yes (host) | Host's incoming bookings |
| GET | `/:id` | Yes | Get booking details |
| PUT | `/:id/status` | Yes (host/admin) | Update booking status |
| PUT | `/:id/cancel` | Yes | Cancel booking |

### Payments (`/api/v1/payments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook` | No (signature-verified) | Moyasar webhook |
| POST | `/initiate` | Yes | Initiate payment |
| POST | `/verify` | Yes | Verify payment status |
| GET | `/my-payments` | Yes | User's payment history |
| GET | `/:id` | Yes | Get payment details |
| GET | `/` | Yes (admin) | List all payments |
| POST | `/:id/refund` | Yes (admin) | Refund payment |

### Reviews (`/api/v1/reviews`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/property/:propertyId` | No | Get property reviews |
| POST | `/` | Yes | Create review |
| PUT | `/:id` | Yes | Update review |
| DELETE | `/:id` | Yes | Delete review |

### Host (`/api/v1/host`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Yes (host) | Dashboard statistics |
| GET | `/recent-bookings` | Yes (host) | Recent bookings |
| GET | `/notifications` | Yes (host) | Host notifications |
| GET | `/earnings` | Yes (host) | Earnings analytics |
| GET | `/calendar` | Yes (host) | Booking calendar |
| POST | `/block-dates` | Yes (host) | Block unavailable dates |
| GET | `/reviews` | Yes (host) | Guest reviews |

### Messages (`/api/v1/messages`)
| Method | Path | Auth | Rate-limited |
|--------|------|------|-------------|
| GET | `/conversations` | Yes | 30/min |
| GET | `/conversations/:id` | Yes | 30/min |
| POST | `/conversations` | Yes | 30/min |
| POST | `/conversations/:id/messages` | Yes | 30/min |
| PUT | `/conversations/:id/block` | Yes | 30/min |

### Notifications (`/api/v1/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get all notifications |
| PUT | `/:id/read` | Yes | Mark as read |
| PUT | `/read-all` | Yes | Mark all as read |
| GET | `/unread-count` | Yes | Get unread count |

### Wallet (`/api/v1/wallet`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/balance` | Yes | Get wallet balance |
| GET | `/transactions` | Yes | Get transaction history |

### Admin (`/api/v1/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Yes (admin) | Dashboard stats |
| GET | `/users` | Yes (admin) | List users |
| GET | `/users/:id` | Yes (admin) | Get user details |
| PATCH | `/users/:id` | Yes (admin) | Update user (suspend/unsuspend/set role) |
| GET | `/properties` | Yes (admin) | List all properties |
| POST | `/properties/:id/moderate` | Yes (admin) | Approve/reject property |
| GET | `/bookings` | Yes (admin) | List all bookings |
| PATCH | `/bookings/:id` | Yes (admin) | Update booking |
| GET | `/payments` | Yes (admin) | List all payments |
| POST | `/payments/:id/refund` | Yes (admin) | Refund payment |
| GET | `/logs` | Yes (admin) | Activity logs |

### Support (`/api/v1/support`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my-tickets` | Yes | User's tickets |
| POST | `/` | Yes | Create ticket |
| GET | `/:id` | Yes | Get ticket details |
| POST | `/:id/reply` | Yes | Reply to ticket |
| PUT | `/:id/status` | Yes (admin) | Update ticket status |
| GET | `/` | Yes (admin) | List all tickets |

### Reports (`/api/v1/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Report user/property |
| GET | `/` | Yes (admin) | List all reports |
| GET | `/:id` | Yes (admin) | Get report details |
| POST | `/:id/action` | Yes (admin) | Take action on report |

### Upload (`/api/v1/upload`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/avatar` | Yes | Upload single image (max 5MB) |
| POST | `/property-images` | Yes (host) | Upload multiple images (max 10, 5MB each) |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/coupons/validate` | Yes | Validate coupon code |
| GET | `/payment-methods` | Yes | List saved payment methods |

## Health Endpoints (no auth)
| Path | Description |
|------|-------------|
| `GET /health/live` | Liveness probe (503 during bootstrap, 200 after) |
| `GET /health/ready` | Readiness probe (checks MongoDB connection) |
| `GET /health` | Full health with uptime and dependency status |
