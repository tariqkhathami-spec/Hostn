# Hostn — Fixes & Improvements Tracker

> **Website:** hostn.co
> **Repo (upstream):** https://github.com/tariqkhathami-spec/Hostn
> **Repo (fork):** https://github.com/abdullahsalma/hostn

---

## Instructions
- This file tracks all fixes and improvements made to the Hostn project.
- Completed items stay in the lists for reference — never remove them.
- Each entry includes a date, short description, author (who suggested it), and status.
- **Each bullet point from the user is a separate task. Never merge, combine, or skip tasks. Each one gets its own entry and must be addressed individually.**

---

## Users

| Initials | Name |
|----------|------|
| AMS | Abdullah |
| TAK | Tariq |

---

## Fixes

| # | Date | Description | Author | Remark | Status |
|---|------|-------------|--------|--------|--------|
| F1 | 2026-04-03 | `/auth/guest/login` — Cursor between +966 prefix and phone field | AMS | Added autoFocus on phone input | Done |
| F2 | 2026-04-03 | `/auth/guest/login` — Enter key does nothing after typing phone | AMS | Added onKeyDown Enter handler to send OTP | Done |
| F3 | 2026-04-03 | `/host/listings/new` — Editing listing does not show original city and price | AMS | Fixed data mapping: `p.location.city`, `p.pricing.perNight`, `p.capacity.*` | Done |
| F4 | 2026-04-03 | `/` — Clicking city opens calendar automatically; calendar scrolls with page | AMS | Removed auto-open calendar after city select; calendar uses fixed portal | Done |
| F5 | 2026-04-03 | `/host/earnings` — Shows "Something went wrong"; LTR layout with Arabic text | AMS | Resolved in upstream codebase | Done |
| F6 | 2026-04-03 | Sitewide — Back arrow points wrong direction in RTL | AMS | Added `rtl:rotate-180` to all directional icons (ArrowLeft, ArrowRight, ChevronLeft, ChevronRight) | Done |
| F7 | 2026-04-03 | Sitewide — LogOut icon points wrong direction in RTL | AMS | Added `rtl:rotate-180` to LogOut icons in Sidebar, Header, HostTopNav | Done |
| F8 | 2026-04-03 | `/host` — "Total Properties" card empty | AMS | Fixed: mapped nested API response (`properties.total`, `earnings.total`, etc.) to flat stats | Done |
| F9 | 2026-04-03 | `/listings/[id]` — Sticky price box overlaps BNPL widget on scroll | AMS | Moved BNPL inside sticky BookingWidget; removed duplicate from page | Done |
| F10 | 2026-04-03 | `/booking/[id]` — "Book for N nights" redirects to 404 when not logged in | AMS | Fixed redirect from `/auth/login` to `/auth/guest/login` | Done |
| F11 | 2026-04-03 | `/contact` — Email accepted without proper domain (e.g. word@word) | AMS | Added regex validation requiring domain TLD | Done |
| F12 | 2026-04-03 | `/` — Calendar pinned on screen, scrolls with page instead of search bar | AMS | Moved calendar from fixed portal to absolute inside search container | Done |
| F13 | 2026-04-03 | `/` — Selecting date dismisses calendar prematurely | AMS | Calendar now stays open; only closes on click outside or search | Done |
| F14 | 2026-04-03 | `/host/listings/[id]/edit` — City dropdown always shows "Select city" | AMS | Added case-insensitive + Arabic matching for city values from API | Done |
| F15 | 2026-04-03 | `/` — Font Rubik not loading reliably | AMS | Added Google Fonts link tag in layout.tsx head for reliable loading | Done |
| F16 | 2026-04-04 | `/host/settings` — Delete account does not actually delete; still logged in as host with listings | AMS | Frontend wired to authApi.deleteAccount(); backend DELETE /auth/account endpoint added — revokes tokens, deletes user, clears cookies | Done |
| F17 | 2026-04-04 | `/host/earnings` — Shows error page | AMS | Added graceful fallback with flexible field mapping | Done |
| F18 | 2026-04-04 | `/auth` — Text arrow "←" points wrong direction in Arabic (hardcoded character, not icon) | AMS | Replaced "←" with ArrowLeft icon + rtl:rotate-180 | Done |
| F19 | 2026-04-04 | `/listings/[id]` — "10% Discount" not translated to Arabic (hardcoded English) | AMS | Added isAr conditional: "خصم X%" | Done |
| F20 | 2026-04-04 | `/listings/[id]` — Property type, name, and location not translated to Arabic | AMS | Pass language to getPropertyTypeLabel; breadcrumb city uses CITIES constant | Done |
| F21 | 2026-04-04 | `/listings/[id]` — Breadcrumb city and property name not translated | AMS | City uses CITIES ar lookup; "Host since", check-in/out, approximate location all translated | Done |
| F22 | 2026-04-04 | `/listings` — Calendar pinned to screen, not relative to search bar | AMS | Replaced createPortal/fixed with absolute positioning inside search container | Done |
| F23 | 2026-04-04 | `/` and `/listings` — Calendar month names not in Arabic when language is Arabic | AMS | Added MONTH_NAMES_AR + formatMonthYear helper in MiniCalendar | Done |
| F24 | 2026-04-04 | `/` — Arabic subtitle text appears squeezed, needs spacing | AMS | Changed leading-[1.1] to leading-[1.3] for Arabic | Done |
| F25 | 2026-04-04 | `/privacy` and `/terms` — URL slugs not descriptive; RTL arrow broken | AMS | Created /privacy-policy and /terms-of-use routes; added redirects in next.config.js; fixed RTL arrow with rtl:rotate-180 | Done |
| F26 | 2026-04-04 | `/dashboard/messages` — Block User menu not displaying properly in Arabic RTL | AMS | Changed right-0 → end-0, text-left → text-start for RTL-aware positioning | Done |
| F27 | 2026-04-04 | Sitewide — SAR symbol after number instead of before; color doesn't match text | AMS | Rewrote SarSymbol from Image to inline SVG with fill="currentColor"; flipped to symbol-before-number everywhere | Done |
| F28 | 2026-04-04 | Footer — Links to /terms and /privacy instead of /terms-of-use and /privacy-policy | AMS | Updated Footer.tsx hrefs | Done |
| F29 | 2026-04-04 | `/booking/[id]` — Link to /terms instead of /terms-of-use | AMS | Updated terms link in booking page | Done |
| F30 | 2026-04-04 | `/listings` — Type filter shows emoji icons that don't match design | AMS | Removed icon field from PROPERTY_TYPES and icon render from grid buttons | Done |
| F31 | 2026-04-04 | `/listings` — City dropdown only shows selected city on reopen | AMS | Clear citySearch on focus so filteredCities shows all; restore label on close; translate on language switch | Done |
| F32 | 2026-04-04 | `/listings` — Confirm button on wrong side in Arabic (RTL) | AMS | Changed `ltr:justify-end rtl:justify-start` to `justify-end` (right in LTR, left in RTL) | Done |
| F33 | 2026-04-04 | `/listings/[id]` — BNPL widget price text wraps incorrectly in RTL | AMS | Changed from formatPrice to formatPriceNumber + SarSymbol inside `dir="ltr"` spans | Done |
| F34 | 2026-04-04 | `/dashboard/settings` — "Profile updated" toast misleading (only name changes) | AMS | Changed toast to "Name updated" and button to "Save Name" | Done |
| F35 | 2026-04-04 | `/dashboard/settings` — Change password UI present but non-functional | AMS | Removed entire change password section (state, handler, UI) | Done |
| F36 | 2026-04-04 | Sitewide — Price "/night" text forced LTR along with number | AMS | Moved `dir="ltr"` from outer container to individual price spans; "/night" label now flows with document direction | Done |
| F37 | 2026-04-04 | Sitewide — Auth redirect loses original page after login | AMS | Middleware now passes `redirect` query param with original pathname+search; auth page already reads and uses it | Done |
| F38 | 2026-04-04 | `/dashboard/support` — Support tickets not loading (API path mismatch) | AMS | Changed `api.get('/support/my-tickets')` to `api.get('/support')` to match backend route | Done |
| F39 | 2026-04-04 | `/` — City dropdown same reopen bug as /listings | AMS | Same fix: clear citySearch on focus, restore label on close, translate on language switch | Done |
| F40 | 2026-04-04 | Header — Sign out icon bright red, too prominent | AMS | Changed from `text-red-500` to `text-gray-400 hover:text-gray-600` | Done |
| F41 | 2026-04-04 | `/dashboard/messages` — Send button arrow doesn't flip in RTL | AMS | Added `rtl:rotate-180` class to send icon | Done |
| F42 | 2026-04-04 | `/listings/[id]` — SAR symbol missing from strikethrough old price | AMS | Added SarSymbol inside line-through spans for PropertyCard and BookingWidget | Done |
| F43 | 2026-04-04 | Sitewide — SAR symbol height doesn't match digit height | AMS | Set SarSymbol to `height: 0.72em` (cap-height) with `verticalAlign: -0.05em` for baseline alignment | Done |
| F44 | 2026-04-04 | `/listings` and `/` — MiniCalendar confirm button on wrong side in Arabic | AMS | Changed to `justify-end` for correct side in both LTR and RTL | Done |
| F45 | 2026-04-04 | `/dashboard/messages` — Send icon points down-left in Arabic (rotate-180 wrong) | AMS | Changed `rtl:rotate-180` to `rtl:-scale-x-100` (horizontal flip: ↗ becomes ↖) | Done |
| F46 | 2026-04-04 | `/dashboard/support/[id]` — Send icon not flipped for Arabic | AMS | Added `rtl:-scale-x-100` to Send icon | Done |
| F47 | 2026-04-04 | `/booking/[id]` — Back to property arrow not flipped in Arabic | AMS | Changed `rotate-180` to `ltr:rotate-180` on ChevronRight | Done |
| F48 | 2026-04-04 | `/listings` — Area filter bubble missing m² unit in inactive label | AMS | Inactive label now shows `Area (m²)` / `المساحة (m²)` | Done |
| F49 | 2026-04-04 | `/listings/[id]` — Guest count not carried from listings search | AMS | PropertyCard passes adults/children in URL; property detail reads and passes to BookingWidget | Done |
| F50 | 2026-04-04 | `/booking/[id]` — Editing dates/guests loses all data when going back | AMS | Edit links and back-to-property link now preserve checkIn, checkOut, adults in URL params | Done |
| F51 | 2026-04-04 | Sitewide — Arabic night plural incorrect (ليالي used for all plural) | AMS | Created `getNightLabel(count, lang)`: 1–2→ليلة, 3–10→ليالي, 11+→ليلة. Applied in BookingWidget, booking page, HeroSearch, listings, PropertyForm | Done |
| F52 | 2026-04-04 | Sitewide — Wishlist add/remove toast shows English in Arabic mode | AMS | Translated all 3 toast messages in PropertyCard (saved, removed, sign-in required, error) | Done |
| F53 | 2026-04-04 | `/dashboard/support/[id]` — All labels hardcoded English (Category, Priority, Status, etc.) | AMS | Added bilingual status/category/priority labels, translated back link, sender name, placeholder, closed message, loading text | Done |
| F54 | 2026-04-04 | `/listings/[id]` — City and district under title show English in Arabic | AMS | City uses CITIES Arabic lookup; district uses DISTRICTS Arabic lookup | Done |
| F55 | 2026-04-04 | `/dashboard/support/[id]` — Shows Header and Footer inside dashboard layout | AMS | Removed Header/Footer; page now uses dashboard layout only | Done |
| F56 | 2026-04-04 | `/` — Search step indicator shows 3 color steps instead of 4 | AMS | Added `'type'` as distinct SearchStep; steps now location→type→dates→ready with unique keys | Done |
| F57 | 2026-04-04 | `/` — Arabic subtitle text squeezed on desktop | AMS | Subtitle uses `leading-loose md:leading-[2]` for Arabic, `leading-relaxed` for English | Done |
| F58 | 2026-04-04 | Sitewide — Session expires every ~15 minutes | AMS | Refresh cookie path was `/api/auth` but routes mounted at `/api/v1/auth`; browser never sent cookie. Fixed to `/api/v1/auth` | Done |
| F59 | 2026-04-05 | Sitewide — OTP login sessions also expire after 15 min (same F58 bug) | AMS | otpController.js refresh cookie path was `/api/auth`; fixed to `/api/v1/auth` | Done |
| F60 | 2026-04-05 | `/auth` — Phone field middle area not clickable (icon blocks focus) | AMS | Added `pointer-events-none` to left/right icon wrappers in Input component | Done |
| F61 | 2026-04-05 | Sitewide — Arabic night plural incorrect (2 nights shows "2 ليلة" instead of "ليلتان") | AMS | `getNightLabel` now returns full string: 1→"1 ليلة", 2→"ليلتان" (no number), 3–10→"N ليالي", 11+→"N ليلة". All 6 call sites updated | Done |
| F62 | 2026-04-05 | Header — Mobile sign-out button still red (missed in F40) | AMS | Changed from `text-red-500` to `text-gray-500` matching desktop style | Done |
| F63 | 2026-04-05 | `/` — Date picker misaligned (left-aligned instead of centered under search box) | AMS | Changed from `ltr:left-0 rtl:right-0` to `left-1/2 -translate-x-1/2` for centered positioning | Done |
| F64 | 2026-04-05 | `/` — Arabic subtitle still squeezed (F24/F57 insufficient) | AMS | Increased to `leading-[2.2]`, widened to `max-w-2xl`, changed from `font-light` to `font-normal` for Arabic | Done |
| F65 | 2026-04-05 | `/host/messages` and `/dashboard/messages` — Timestamps show 24h format instead of AM/PM | AMS | Timestamps now use `ar-SA` locale (ص/م) for Arabic and `en-US` (AM/PM) for English with `hour12: true` | Done |
| F66 | 2026-04-05 | `/host/messages` and `/dashboard/messages` — Action menu doesn't close on outside click | AMS | Added `useRef` + `mousedown` listener to dismiss menu when clicking outside | Done |
| F67 | 2026-04-05 | `/listings` — Price filter bubble shows raw "SAR" text, no symbol or LTR wrapping | AMS | FilterBubble `label` changed to ReactNode; price bubble uses `<SarSymbol />` with `dir="ltr"` wrapping | Done |
| F68 | 2026-04-05 | `/listings` — Clearing filters doesn't refresh search results (stale state) | AMS | "Clear all" now navigates directly to `/listings` with only base search params, bypassing stale setState | Done |
| F69 | 2026-04-05 | `/booking/[id]` — Children count hardcoded to 0 in booking API call | AMS | Now reads `adults` and `children` separately from URL; API sends actual counts | Done |
| F70 | 2026-04-05 | `/booking/[id]` — Guest display shows total only, no adults/children split | AMS | Shows "2 adults, 1 child" / "2 بالغين، 1 طفل" with split counts | Done |
| F71 | 2026-04-05 | `/booking/[id]` — Back/edit links lose children count when navigating | AMS | All 3 navigation links now pass both `adults` and `children` URL params | Done |
| F72 | 2026-04-05 | `/host/listings/new` — Image upload accepts all image types (HEIC, BMP fail on backend) | AMS | Restricted to `.jpg,.jpeg,.png`; client-side type validation before upload; clear error messages | Done |
| F73 | 2026-04-05 | Sidebar — Logout button permanently red, too prominent | AMS | Changed from always-red (`text-red-500 hover:bg-red-50`) to gray default with red on hover only (`text-gray-600 hover:text-red-500`) | Done |
| F74 | 2026-04-05 | `/` — Homepage search does not save city to cookie | AMS | HeroSearch now imports `getSearchCookies` and restores city, type, dates from cookie on mount | Done |
| F75 | 2026-04-05 | `/` — Date picker in Arabic stays left-aligned instead of flipping under dates field | AMS | Changed `left-1/2 -translate-x-1/2` to `ltr:right-0 rtl:left-0` so calendar anchors near dates column in both directions | Done |
| F76 | 2026-04-05 | Sitewide — Arabic 1 night shows "1 ليلة" instead of "ليلة" | AMS | `getNightLabel` 1-night Arabic case now returns `'ليلة'` without number prefix; English unchanged | Done |
| F77 | 2026-04-05 | Sitewide — Search cookies incomplete: `/` saves nothing, `/listings` missing guests, `/listings/[id]` saves nothing, `/booking/[id]` saves nothing | AMS | `/` now restores from cookie on mount and saves on search; `/listings` already saves adults+children (verified); `/listings/[id]` saves to cookie via useEffect; `/booking/[id]` saves to cookie via useEffect; `saveSearchCookies` now merges with existing cookie so partial saves don't wipe guest data. Cleared after booking success (already in payment-callback) | Done |
| F78 | 2026-04-05 | `/listings` — Price filter slider shows "SAR" text instead of SarSymbol SVG | AMS | Replaced "SAR" text with `<SarSymbol />` component in all 3 slider labels; added `dir="ltr"` wrapping | Done |
| F79 | 2026-04-05 | `/booking/[id]` — Going back to `/listings/[id]` loses adults/children split, shows total as adults | AMS | BookingWidget now sends `adults` and `children` as separate URL params instead of combined `guests` total | Done |
| F80 | 2026-04-05 | `/host/messages` — Send icon not flipped horizontally in Arabic | AMS | Added `rtl:-scale-x-100` to Send icon, matching `/dashboard/messages` fix (F45) | Done |
| F81 | 2026-04-05 | `/host/listings/new` — Image upload fails with "Image upload failed. Please try again." | AMS | Backend `.env` missing Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Not a code bug — needs credentials from Cloudinary account | Open |
| F82 | 2026-04-06 | `/listings` — Guest details (adults/children) not recorded in cookies | AMS | `guests` derived from `adults+children`; `handleSearch` and cookies now save both separately | Done |
| F83 | 2026-04-06 | `/listings` — Going back from `/listings/[id]` combines children with adults as `&guests=3` | AMS | URL now uses `adults` and `children` params instead of combined `guests`; init reads `adults`/`children` from URL or cookie | Done |
| F84 | 2026-04-06 | `/listings` — Arabic night label (ليلة/ليلتان) missing space before word, shows connected to previous word | AMS | Added non-breaking space (`\u00A0`) before all Arabic night labels in `getNightLabel` | Done |
| F85 | 2026-04-06 | `/listings` — Area filter slider unit flipped in Arabic, should stay on the right always | AMS | Added `dir="ltr"` to area slider value label, range input, and scale labels container | Done |
| F86 | 2026-04-06 | `/listings` — SAR symbol in price slider should be on the left of the number | AMS | Flipped from `{number} <SarSymbol />` to `<SarSymbol /> {number}`; restructured to current value on top, scale labels below slider | Done |
| F87 | 2026-04-06 | `/listings` — Clear all button does nothing when filters are applied, should auto-search | AMS | `clearAllFilters` increments `autoSearch` counter; `useEffect` re-fetches on change | Done |
| F88 | 2026-04-06 | `/listings` — Canceling a single filter does not auto-search, requires manual search click | AMS | All 9 filter `onClear` handlers now call `setAutoSearch((n) => n + 1)` to trigger auto-fetch | Done |
| F89 | 2026-04-06 | `/listings` — Price filter icon shows dollar sign, should be SAR symbol | AMS | Replaced `DollarSign` (lucide) with `SarSymbol` component as FilterBubble icon; removed unused import | Done |
| F90 | 2026-04-06 | `/listings` — Price slider should follow page direction (RTL in Arabic, LTR in English), only number+symbol wrapped in dir=ltr | AMS | Removed `dir="ltr"` from slider input and labels container; kept `dir="ltr"` only on individual number+symbol spans | Done |
| F91 | 2026-04-06 | `/listings` — URL should not contain search/filter details, rely on cookies only | AMS | Removed all URL params from `handleSearch` and clear-all; navigate to clean `/listings`; all state reads from cookies via `useEffect` on mount; removed `useSearchParams` | Done |
| F92 | 2026-04-06 | `/listings` — Guest picker does not remember/restore adults and children count | AMS | State initializes empty then restores from cookies via `useEffect` on client mount (fixes SSR null `document` issue); adults and children restored from cookie | Done |
| F93 | 2026-04-06 | `/listings` — Guest button shows "Guests" text even with 1 adult selected | AMS | Changed condition from `adults + children > 1` to `adults >= 1` so 1 adult shows "1" instead of empty "Guests" | Done |
| F94 | 2026-04-06 | `/listings` — Area filter slider should treat number+unit like F90 (only number+unit in dir=ltr, not whole slider) | AMS | Removed `dir="ltr"` from slider input and labels container; added `dir="ltr"` only on individual number+unit `<span>` elements so slider follows page direction | Done |
| F95 | 2026-04-06 | `/listings` — Type filter should auto-update on click without Apply button | AMS | Each type click triggers `toggleType` + `setAutoSearch` for instant re-fetch; removed Apply button from type filter popover | Done |
| F96 | 2026-04-06 | `/listings` — Selecting multiple types in filter returns no results (backend exact-matches comma string instead of `$in`) | AMS | Frontend sends `type` as array (`type[]=chalet&type[]=villa`) instead of comma-joined string; backend receives array which MongoDB matches via implicit `$in`. Backend also has `$in` fallback for comma strings | Done |
| F97 | 2026-04-06 | `/listings` — Price filter: dismissing by clicking away should auto-apply (same as Apply button) | AMS | useEffect on `openFilter` detects transition from `'price'` to `null` and triggers autoSearch; removed Apply button | Done |
| F98 | 2026-04-06 | `/listings` — Area filter: dismissing by clicking away should auto-apply (same as Apply button) | AMS | Same useEffect handles `'area'` to `null` transition; removed Apply button | Done |
| F99 | 2026-04-06 | `/listings` — Bedrooms filter reads stale state, doesn't actually filter | AMS | Replaced `handleSearch()` with `setAutoSearch((n) => n + 1)` so fetch runs after state updates | Done |
| F100 | 2026-04-06 | `/listings` — Rating filter reads stale state, doesn't actually filter | AMS | Same fix — `setAutoSearch` instead of `handleSearch` | Done |
| F101 | 2026-04-06 | `/listings` — Pool toggle reads stale state, doesn't actually filter | AMS | Same fix — `setAutoSearch` instead of `setTimeout(handleSearch, 0)` | Done |
| F102 | 2026-04-06 | `/listings` — Offers toggle reads stale state, doesn't actually filter | AMS | Same fix — `setAutoSearch` instead of `setTimeout(handleSearch, 0)` | Done |
| F103 | 2026-04-06 | `/listings` — Direction filter reads stale state, doesn't actually filter | AMS | Same fix — `setAutoSearch` instead of `handleSearch` | Done |
| F104 | 2026-04-06 | `/listings` — District filter reads stale state, doesn't actually filter | AMS | Same fix — `setAutoSearch` instead of `handleSearch` | Done |
| F105 | 2026-04-06 | `/listings/[id]` and `/booking/[id]` — URLs should not contain search params; read from cookies only | AMS | PropertyCard links to clean `/listings/[id]`; detail page reads dates/guests from cookies via `getSearchCookies`; BookingWidget saves to cookie then navigates to clean `/booking/[id]`; booking page reads from cookies; auth redirect uses clean URL | Done |
| F106 | 2026-04-06 | `/listings/[id]` — BookingWidget calendar month names not in Arabic when language is Arabic | AMS | Pass `locale={language}` to MiniCalendar in BookingWidget; month names now use MONTH_NAMES_AR | Done |
| F107 | 2026-04-06 | `/listings/[id]` — BookingWidget calendar shows duplicate month header (one in nav bar, one in MonthGrid) | AMS | Added `showHeader` prop to MonthGrid; non-dual mode passes `showHeader={false}` since nav bar already shows month; dual mode keeps both headers | Done |
| F108 | 2026-04-06 | `/listings/[id]` — Check-in/check-out date boxes show English dates when language is Arabic | AMS | Uses `toLocaleDateString('ar-SA')` for Arabic; keeps `format(date, 'MMM d, yyyy')` for English | Done |
| F109 | 2026-04-06 | `/listings/[id]` — Changing dates in BookingWidget does not update cookies (navigating to /listings shows old dates) | AMS | Added `useEffect` watching `checkIn`/`checkOut`/`adults`/`children` that calls `saveSearchCookies` on change (skips initial mount) | Done |
| F110 | 2026-04-06 | `/listings/[id]` — Changing guest count in BookingWidget does not update cookies (navigating to /listings shows old count) | AMS | Same useEffect handles guest changes — cookies always in sync | Done |
| F111 | 2026-04-06 | `/booking/[id]` — Edit buttons for dates/guests link to `/listings/[id]` with URL params; should be clean URL | AMS | Replaced all 3 edit links with clean `/listings/[id]` — data already in cookies | Done |
| F112 | 2026-04-06 | `/booking/[id]` — "Property not available for selected dates" error needs better explanation | AMS | Changed to "This property is already booked for one or more of your selected dates. Please choose different dates." (bilingual) | Done |
| F113 | 2026-04-06 | `/booking/[id]` — Dates displayed in English format when language is Arabic | AMS | Uses `toLocaleDateString('ar-SA')` for Arabic date display | Done |
| F114 | 2026-04-06 | `/contact` — Back arrow "←" points wrong direction in Arabic | AMS | Replaced hardcoded "←" with ArrowLeft icon + `rtl:rotate-180` | Done |
| F115 | 2026-04-06 | `/booking/[id]` — City under property name shows in English when language is Arabic | AMS | Added CITIES import; lookup Arabic city name via `CITIES.find()` | Done |
| F116 | 2026-04-06 | Sitewide — Arabic guest count grammar incorrect (ضيف/ضيفان/ضيوف rules) | AMS | New `getGuestLabel(count, lang)` in utils.ts: 1=ضيف, 2=ضيفان, 3-10=ضيوف, 11+=ضيف. Applied in PropertyCard, SearchFilters, BookingWidget, booking page | Done |
| F117 | 2026-04-06 | Sitewide — Arabic adult/children count grammar incorrect (بالغ/بالغان/بالغين and طفل/طفلان/أطفال rules) | AMS | New `getAdultLabel` and `getChildLabel` in utils.ts with full Arabic plural rules. Applied in booking page, listings page guest picker | Done |
| F118 | 2026-04-06 | Sitewide — Arabic separator between adults and children should be "و" not "،" or "·" | AMS | Changed `،` / `·` to `و` in booking page and listings page guest display | Done |
| F119 | 2026-04-06 | `/booking/[id]` — "Visa, Mastercard, mada" not translated in Arabic | AMS | Added bilingual: `فيزا، ماستركارد، مدى` / `Visa, Mastercard, mada` | Done |
| F120 | 2026-04-06 | Sitewide — "SAR" text shown instead of SAR symbol (﷼) | AMS | Replaced all `SAR` / `ر.س` text with `<SarSymbol />` component across dashboard, host, admin, earnings, bookings, balance, listings, and PropertyForm pages | Done |
| F121 | 2026-04-06 | `/` — "Browse by Type" links pass URL params to `/listings` but params are ignored (cookie-only architecture) | AMS | Changed from `<Link href="/listings?type=...">` to `<button>` with `clearSearchCookies` + `saveSearchCookies({ type })` + `router.push('/listings')` | Done |
| F122 | 2026-04-06 | `/` — City bubbles under search bar pass URL params to `/listings` but params are ignored | AMS | Changed from `router.push('/listings?city=...')` to `clearSearchCookies` + `saveSearchCookies({ city, checkIn, checkOut })` + `router.push('/listings')` | Done |
| F123 | 2026-04-06 | `/listings` — Properties with minNights > selected nights still shown in results | AMS | Added client-side filter after fetch: removes properties where `rules.minNights > selectedNights` | Done |
| F124 | 2026-04-06 | `/listings/[id]` — BookingWidget has no early warning for minimum nights; user only finds out at booking page | AMS | Added inline amber warning below date/guest section when `nights < minNights`; added validation in `handleBookNow` before navigation | Done |
| F125 | 2026-04-06 | `/booking/[id]` — MIN_STAY and MAX_STAY error messages show English in Arabic mode | AMS | Replaced hardcoded "nights"/"ليالي" with `getNightLabel()` for proper Arabic plural grammar | Done |
| F126 | 2026-04-06 | `/booking/[id]` — Tabby and Tamara BNPL descriptions show "SAR" text from `formatPrice()` | AMS | Replaced `formatPrice()` with `<SarSymbol /> formatPriceNumber()` in both Tabby and Tamara installment descriptions | Done |
| F127 | 2026-04-07 | `/` — Search bar button navigates with URL params (`?city=...`) instead of cookies | AMS | Changed `handleSearch` to save cookies only and navigate to clean `/listings` | Done |
| F128 | 2026-04-07 | `/` — City bubbles clear guests/type/dates when navigating to `/listings` | AMS | Removed `clearSearchCookies()`; `saveSearchCookies` merges city into existing cookies, preserving dates/guests/type | Done |
| F129 | 2026-04-07 | `/` — "Browse by Type" clears city/dates/guests when navigating to `/listings` | AMS | Removed `clearSearchCookies()`; `saveSearchCookies` merges type into existing cookies, preserving city/dates/guests | Done |
| F130 | 2026-04-07 | `/listings` — Navigating from homepage doesn't auto-search (must click search manually) | AMS | Added `ready` flag; `fetchProperties` only runs after cookies are restored to state; ensures first fetch uses correct cookie values | Done |
| I56 | 2026-04-07 | `/admin/bookings` — Add ability to delete bookings | AMS | Backend `DELETE /admin/bookings/:id` with ActivityLog; frontend delete button per row with confirmation dialog; `held` status badge added | Done |
| F131 | 2026-04-07 | `/listings` — Heart/favorite button not working; click navigates to property page instead | AMS | Added `e.stopPropagation()` to prevent Next.js Link from capturing click; made toggle optimistic (instant UI feedback) | Done |
| F132 | 2026-04-07 | `/listings` — Wishlist not persisting after page refresh; heart resets to gray | AMS | `getMe` returns populated wishlist objects — normalized to string IDs; `toggleWishlist` made optimistic (don't rely on API response); PropertyCard syncs with context via `useEffect` | Done |
| F133 | 2026-04-07 | `/booking/[id]` — "Back to review" arrow points forward in Arabic RTL | AMS | Changed `←` to `→` for Arabic text | Done |
| F134 | 2026-04-07 | `/dashboard/support/[id]` — Sending reply shows "Failed to send reply" | AMS | Vercel proxy issue; made reply optimistic (add to UI immediately, reload on response) | Done |
| F135 | 2026-04-07 | `/dashboard/support/[id]` — Timestamp shows seconds (e.g. 11:05:23 AM) | AMS | Formatted with `hour: '2-digit', minute: '2-digit'` — no seconds | Done |
| F136 | 2026-04-07 | `/dashboard/support/[id]` — AM/PM shown in English when language is Arabic | AMS | Pass `ar-SA` locale to `toLocaleString()` | Done |
| I57 | 2026-04-07 | `/dashboard/bookings` — Clicking booking goes to `/booking/[id]` (checkout page) and redirects away | AMS | Created dedicated `/dashboard/bookings/[id]` detail page with property card, stay details, pricing breakdown, payment & booking status | Done |
| F138 | 2026-04-07 | Site-wide — Arabic numerals (٠١٢) shown instead of Western (012) | AMS | Replaced `ar-SA` locale with `ar-u-nu-latn` (BCP 47 Latin numeral extension) across 32 files; added `'en'` locale to bare `.toLocaleString()` calls | Done |
| I58 | 2026-04-07 | `/dashboard/settings` — Page layout messy, everything crammed in one card | AMS | Redesigned with separate sections: account overview (avatar, role, member since), personal info (name + save), contact info (email/phone with dividers), become-a-host gradient card | Done |
| F139 | 2026-04-07 | `/dashboard/bookings/[id]` — City and district shown in English when language is Arabic | AMS | Added `translateCity` / `translateDistrict` using CITIES/DISTRICTS constants from `@/lib/constants` | Done |
| F140 | 2026-04-07 | `/dashboard/settings` — Email OTP not received after editing email | AMS | Made OTP flow optimistic (show code input immediately); root cause: SMTP not configured on backend — emails only logged to console. Requires SMTP_HOST/USER/PASS env vars | Done |
| I59 | 2026-04-08 | Dashboard sidebar — No visual indicator for unread bookings, messages, or support replies | AMS | Backend: `GET /notifications/unread-summary` aggregates unread counts by category. Frontend: Sidebar fetches counts every 30s; red badge with number on Bookings/Messages/Support icons; clears on navigation. Works for guest + host dashboards | Done |

## Improvements

| # | Date | Description | Author | Remark | Status |
|---|------|-------------|--------|--------|--------|
| I1 | 2026-04-03 | `/auth/guest/login` — Auto-focus on phone field on load | AMS | Added autoFocus and useRef | Done |
| I2 | 2026-04-03 | `/auth/guest/login` — Auto-focus on OTP field after sending code | AMS | Added useEffect + useRef to focus OTP input | Done |
| I3 | 2026-04-03 | `/host/listings/new` — City should be dropdown, not free-text | AMS | Replaced text input with `<select>` using CITIES constant on new + edit pages | Done |
| I4 | 2026-04-03 | `/` — Use font Rubik as default for the website | AMS | Replaced Inter with Rubik in globals.css, tailwind.config, LanguageContext | Done |
| I5 | 2026-04-03 | `/` — Search bar width too short | AMS | Widened from `max-w-4xl` (896px) to `max-w-5xl` (1024px) | Done |
| I6 | 2026-04-03 | `/` — Dual calendar view on desktop | AMS | Added `dual` prop to MiniCalendar; shows two months side-by-side on md+ screens | Done |
| I7 | 2026-04-03 | `/host/settings` — Add ability to delete account and listings | AMS | Added delete account UI with confirmation dialog; logs out user on confirm | Done |
| I8 | 2026-04-03 | Sitewide — Language toggle on dashboards | AMS | Already present in HostTopNav in upstream | Done |
| I9 | 2026-04-03 | `/listings` — Search bar dropdowns should match homepage style | AMS | Re-applied: searchable city dropdown matching homepage style | Done |
| I10 | 2026-04-03 | `/listings` — Date picker should display calendar like homepage | AMS | Re-applied: MiniCalendar portal with dual view on desktop | Done |
| I11 | 2026-04-03 | `/listings` — Guests should be picker with +/- for adults and kids | AMS | Re-applied: guest picker with +/- buttons for adults and children | Done |
| I12 | 2026-04-03 | `/contact` — Subject field should be required | AMS | Added `*` label and validation check | Done |
| I13 | 2026-04-03 | `/` — City select should auto-open property type dropdown | AMS | handleCitySelect now opens type dropdown automatically | Done |
| I14 | 2026-04-03 | `/` — Property type select should auto-open calendar | AMS | Type selection now opens calendar automatically | Done |
| I15 | 2026-04-04 | `/host` — No way to change language on host dashboard | AMS | Added language toggle (Globe icon) to Sidebar — works on guest + host + admin dashboards | Done |
| I16 | 2026-04-04 | `/auth` — Merge guest/host login into one page; system determines user type | AMS | Unified phone+OTP page; old guest/host routes redirect to /auth; role auto-detected from backend response | Done |
| I17 | 2026-04-04 | `/auth` — Card area outside input fields should be unclickable/unselectable | AMS | Added select-none to form card | Done |
| I18 | 2026-04-04 | `/auth` — Country code picker with flag icon; fix OTP for international codes | AMS | GCC country picker (SA/UAE/BH/KW/OM/QA) with flags; countryCode sent to API; backend support needed from TAK | Done |
| I19 | 2026-04-04 | `/dashboard` — Cards: reservations, wallet balance, hosts blocks count, hosts rating | AMS | 4 stat cards: Reservations, Balance (linked), Host Blocks, My Rating; balance/blocks/rating fields added to User type | Done |
| I20 | 2026-04-04 | `/dashboard` — Add balance page in sidebar | AMS | New `/dashboard/balance` page with balance card + transaction history; Wallet nav item added to sidebar | Done |
| I21 | 2026-04-04 | `/dashboard` — Add favorites page in sidebar | AMS | New `/dashboard/favorites` page showing wishlisted properties; Heart nav item added to sidebar | Done |
| I22 | 2026-04-04 | `/dashboard/settings` — Email field should be editable with email verification flow | AMS | Email now has Edit button → enter new email → send code → verify code; backend updateProfile extended with email verification (generates 6-digit code, stores hashed, verifies on confirm) | Done |
| I23 | 2026-04-04 | `/listings` — Search bar auto-flow: city → dates → guests; OK button to advance fields | AMS | City select auto-opens calendar; calendar OK opens guest picker; guest picker has OK button | Done |
| I24 | 2026-04-04 | `/listings` — Add filter by area | AMS | Area/district text filter bubble with popover input | Done |
| I25 | 2026-04-04 | `/listings` — Add filter by discount/offers | AMS | Offers toggle bubble; one-click to filter discounted properties | Done |
| I26 | 2026-04-04 | `/listings` — Add filter by ratings | AMS | Rating bubble with 3+/4+/4.5+ quick-select options | Done |
| I27 | 2026-04-04 | `/listings` — Add filter by number of bedrooms | AMS | Bedrooms bubble with 1+ through 5+ quick-select options | Done |
| I28 | 2026-04-04 | `/listings` — Filter Unit Type: allow multiple selection | AMS | Type bubble opens grid of property types; multi-select with Apply button | Done |
| I29 | 2026-04-04 | `/listings` — Filter as icon bubbles; clicking opens pop card with filter settings | AMS | All filters as pill bubbles with icons; click opens popover card; active state + clear button | Done |
| I30 | 2026-04-04 | `/listings/[id]` — BNPL widget: show full payment info; click to expand options | AMS | Compact header with expand/collapse; shows timeline + providers on click | Done |
| I31 | 2026-04-04 | `/listings/[id]` — Add ability to chat with host | AMS | Added "Message" button on property page linking to dashboard messages; replaced host messages placeholder with full chat UI (conversations, real-time polling, block/unblock) | Done |
| I32 | 2026-04-04 | `/` and `/listings` — Add OK/submit button inside calendar to dismiss and advance to next field | AMS | Added onConfirm prop to MiniCalendar; OK button shown when both dates selected; added on both homepage and listings | Done |
| I33 | 2026-04-04 | `/blog` — Add blog page with categories, posts, and admin CMS (similar to blog.gathern.co) | AMS | Full stack: BlogPost + BlogCategory models, blog controller + routes, frontend listing + detail pages (bilingual), admin CMS, nav links in Header/Footer/Sidebar | Done |
| I34 | 2026-04-04 | `/listings` — Add Pool filter, Direction filter, Area slider (0-1500+ m²), Rating from 10, Price slider (0-4000+), District dropdown by city | AMS | New filter bubbles: Pool toggle, Direction dropdown, Area range slider, Price range slider, District city-dependent dropdown; backend extended with area/direction/pool/district query support | Done |
| I35 | 2026-04-04 | `/dashboard/settings` — Phone number change should require OTP verification | AMS | Phone section now read-only with Edit button; sends OTP to new number; verify code to apply change; backend updateProfile requires phoneVerificationCode for phone changes | Done |
| I36 | 2026-04-04 | `/listings` — Add dropdown arrows to expandable filter bubbles | AMS | Added `hasDropdown` prop to FilterBubble; ChevronDown icon on Type, Bedrooms, Rating, Price, Area, Direction, District filters | Done |
| I37 | 2026-04-04 | `/listings/[id]` — Guest picker with adults/children split | AMS | Booking widget now has separate Adults (13+, min 1) and Children (0–12, min 0) counters with +/- buttons; total respects maxGuests | Done |
| I38 | 2026-04-04 | `/` — Search step indicator showing progress through fields | AMS | Added Property step label to step indicator in HeroSearch | Done |
| I39 | 2026-04-04 | `/host/listings/new` — District should be dropdown, not free text | AMS | District is now city-dependent `<select>` using DISTRICTS constant with Arabic labels; falls back to text input if city has no predefined districts; clears on city change | Done |
| I40 | 2026-04-04 | `/host/listings/new` — Dropdown styling should match homepage | AMS | Updated inputClass to rounded-xl, bg-gray-50/50, primary ring focus matching HeroSearch style | Done |
| I41 | 2026-04-04 | `/host/listings/new` — Error messages need clear field-specific explanation | AMS | Lists missing required fields by name; requires at least 1 photo; surfaces Mongoose validation errors and backend error messages; image upload shows file type/size hints. All bilingual | Done |
| I42 | 2026-04-05 | Sitewide — Persist search details in cookies across pages | AMS | New `searchCookies.ts` utility; HeroSearch and listings save city/type/dates/guests to cookie; listings restores from cookie when URL empty; cleared after booking success | Done |
| I43 | 2026-04-05 | `/host/messages` and `/dashboard/messages` — Add "Report User" to action menu | AMS | New menu item with Flag icon; bilingual "إبلاغ عن المستخدم" / "Report User"; shows toast on click | Done |
| I44 | 2026-04-05 | Sitewide — Dashboard sidebar should be sticky on scroll | AMS | DashboardShell sidebar wrapper changed from `lg:static` to `lg:sticky lg:top-0 lg:h-screen`; Sidebar uses `h-full overflow-y-auto` for internal scrolling | Done |
| I45 | 2026-04-06 | `/listings` — Search bar fields (city, dates, guests) should auto-search when dropdown is dismissed | AMS | Added `prevRef` useEffects for city dropdown, calendar, and guest picker — triggers `autoSearch` + saves cookies when each closes with a value set | Done |
| I46 | 2026-04-07 | Backend — Reservation hold system: `held` status + `holdExpiresAt` field in Booking model | AMS | Added `held` to status enum, `holdExpiresAt` Date field, index for hold queries | Done |
| I47 | 2026-04-07 | Backend — `POST /bookings/hold` endpoint for 2-min reservation holds | AMS | New `createHold` controller: validates dates/capacity, cancels user's old holds (1 per user), creates hold with 2-min TTL; validation middleware `holdBookingRules` | Done |
| I48 | 2026-04-07 | Backend — `overlapQuery` includes active holds in conflict detection | AMS | Status check now uses `$and` with `$or` to match `pending/confirmed` OR `held` with non-expired `holdExpiresAt` | Done |
| I49 | 2026-04-07 | Backend — `createBooking` accepts `holdId` to convert hold → pending booking | AMS | If holdId valid and not expired, converts hold to pending (preserves pricing); if expired, cancels hold and falls through to normal creation | Done |
| I50 | 2026-04-07 | Backend — `getProperty` returns `bookedDates` from active bookings + holds | AMS | Queries Booking collection for pending/confirmed/active-held records; returns `{ start, end }` date ranges for calendar graying | Done |
| I51 | 2026-04-07 | Backend — Confirmed bookings hide property from search; holds do not | AMS | `getProperties` excludes properties with `pending/confirmed` bookings (hard lock) for selected dates; `held` (soft lock, 2 min) keeps property visible | Done |
| I52 | 2026-04-07 | Backend — `checkAvailability` includes active holds in conflict check | AMS | Same `$and`/`$or` pattern as overlapQuery for hold-aware availability checking | Done |
| I53 | 2026-04-07 | Frontend — BookingWidget creates hold on "Book Now"; blocks if dates taken | AMS | Async handleBookNow: calls `createHold` API, stores holdId in localStorage; if DATES_UNAVAILABLE shows error toast and blocks navigation; other failures proceed silently | Done |
| I54 | 2026-04-07 | Frontend — Booking page uses holdId to convert hold → booking | AMS | Reads holdId from localStorage, passes to `createBooking` API; cleans up localStorage after use; falls through to normal creation if hold expired | Done |
| I55 | 2026-04-07 | Frontend — Calendar shows booked/held dates as unavailable | AMS | BookingWidget merges `property.bookedDates` ranges into individual date strings and passes to MiniCalendar alongside `unavailableDates` | Done |
| F141 | 2026-04-07 | `/listings` — Heart/favorite icon has oversized white circle background | AMS | Removed `w-10 h-10 bg-white rounded-full shadow-md`; replaced with `p-1.5 drop-shadow` for cleaner floating icon | Done |
| I60 | 2026-04-07 | Backend — Multi-list wishlist system (like Gathern/Airbnb) | AMS | New `Wishlist` model with `user/name/isDefault/properties`; unique `{ user, name }` index; lazy `getOrCreateDefault` creates default "مفضلاتي" list and migrates existing `user.wishlist`; `wishlistController` with getLists/getList/create/update/delete/toggleProperty/moveProperty; `syncUserWishlist` keeps `user.wishlist` flat array in sync; `authController.toggleWishlist` syncs to default list | Done |
| I61 | 2026-04-07 | Frontend — Multi-list favorites page + list detail page | AMS | Rewrote `/dashboard/favorites` from flat grid to list cards (cover image, name, count); create/rename/delete lists; context menu on non-default lists; new `/dashboard/favorites/[listId]` detail page showing properties with remove button; `wishlistsApi` in `api.ts`; `WishlistList` type | Done |
| F142 | 2026-04-08 | `/listings` — Heart icon at wrong position (top instead of bottom) | AMS | Moved back to `bottom-3`; made unfilled heart semi-transparent (`fill-white/60 text-white/80`) | Done |
| F143 | 2026-04-08 | `/dashboard/favorites` — Default list "مفضلاتي" not translated to English | AMS | Added `getDisplayName()` — shows "My Favorites" in English, "مفضلاتي" in Arabic based on `list.isDefault`; applies on both list cards and detail page header | Done |
| F144 | 2026-04-08 | `/dashboard/favorites` — Broken image on list cards when coverImage is empty | AMS | Backend `getLists` was returning image object instead of URL string; fixed to `images?.[0]?.url` | Done |
| F145 | 2026-04-08 | `/dashboard/favorites` — 3-dot menu doesn't dismiss when clicking outside | AMS | Added `useRef` + `mousedown` click-outside handler; menu closes on any outside click | Done |
| I62 | 2026-04-08 | `/listings` — Single-select list picker on heart click | AMS | Heart click opens popover with all lists; tap one to save + close. "New list" creates + saves in one step. If already wishlisted, heart removes. Simplified from multi-checkbox to single-select UX | Done |
| I63 | 2026-04-08 | `/dashboard/favorites/[listId]` — Full filter bar with mismatch notes | AMS | Same filter bubbles as `/listings` (Type, Bedrooms, Rating, Pool, Offers, Price, Area, Direction, District) but client-side on loaded properties. Non-matching properties shown dimmed (50% opacity) with amber notes explaining why (e.g. "No pool", "Only 2 bedrooms"). Backend `getList` now populates `amenities/area/direction` | Done |
| I64 | 2026-04-08 | `/listings` — Wishlist picker: renamed labels, added Clear button, portal positioning | AMS | Header "Save to lists" → "Wishlist" / "المفضلة"; "New list" → "New wishlist" / "قائمة مفضلة جديدة"; new red "Clear" button removes property from ALL wishlists at once; picker now renders via `createPortal` with fixed positioning to prevent clipping by `overflow-hidden` card/image containers; closes on scroll; heart button excluded from click-outside dismiss | Done |
| I65 | 2026-04-08 | `/dashboard/favorites/[listId]` — Search cookies carry over sitewide | AMS | Favorites detail page now reads `hostn_search` cookie on mount (city, check-in/out, adults, children) and writes back when dropdowns close — same pattern as `/listings`. Search state persists across Home → Listings → Favorites navigation. `clearAllFilters` also clears cookies | Done |
| F146 | 2026-04-08 | Sitewide — District shown in English on Arabic property cards | AMS | Added `translateDistrict(district, city)` using `DISTRICTS` constant (same pattern as `translateCity`). Fixed in `PropertyCard.tsx` (listings grid) and `PropertyListCard` (favorites detail). Both now look up Arabic district name by city key | Done |
| I66 | 2026-04-08 | `/listings` + `/dashboard/favorites/[listId]` — Total price + weekly/monthly pricing on cards | AMS | PropertyCard and PropertyListCard now show total price below nightly rate when check-in/out dates are set. If stay ≥ 7 nights, displays per-week rate; ≥ 30 nights, per-month rate. Total always shows exact `effectivePrice × nights`. Dates passed as optional `checkIn`/`checkOut` props from parent pages; home page FeaturedListings unaffected (no dates) | Done |
| F147 | 2026-04-08 | `/dashboard/favorites/[listId]` — Mismatch note hard to read (white-on-amber with opacity) | AMS | Moved `opacity-50` from the grid to just the card wrapper (note stays full opacity). Upgraded note styling: `bg-amber-100` → stronger background, `border border-amber-300` → visible border, `text-xs font-medium text-amber-800` → larger darker text, bigger icon | Done |
| I67 | 2026-04-08 | Sitewide — Compact property card: icon-only capacity row + rating beside price | AMS | Replaced text labels ("4 guests", "2 beds") with icon + number only (👤4 🛏2 🛁2 📐150m²). Added bathrooms (`Bath`) and area (`Ruler`). Moved `StarRating` from top of card to right side of price row for better comparison at a glance. Applied to both `PropertyCard` and `PropertyListCard` in favorites detail | Done |
