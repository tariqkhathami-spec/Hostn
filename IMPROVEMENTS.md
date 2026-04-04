# Hostn — Fixes & Improvements Tracker

> **Website:** hostn.co
> **Repo (upstream):** https://github.com/tariqkhathami-spec/Hostn
> **Repo (fork):** https://github.com/abdullahsalma/hostn

---

## Instructions
- This file tracks all fixes and improvements made to the Hostn project.
- Completed items stay in the lists for reference — never remove them.
- Each entry includes a date, short description, author (who suggested it), and status.

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
