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
| F6 | 2026-04-03 | Sitewide — Back arrow points wrong direction in RTL | AMS | Added `rtl:rotate-180` to all ArrowLeft icons | Done |
| F7 | 2026-04-03 | Sitewide — LogOut icon points wrong direction in RTL | AMS | Added `rtl:rotate-180` to LogOut icons in Sidebar, Header, HostTopNav | Done |
| F8 | 2026-04-03 | `/host` — "Total Properties" card empty | AMS | Fixed: mapped nested API response (`properties.total`, `earnings.total`, etc.) to flat stats | Done |
| F9 | 2026-04-03 | `/listings/[id]` — Sticky price box overlaps BNPL widget on scroll | AMS | Added max-height with overflow scroll on sticky card; wrapped BnplWidget with z-0 | Done |
| F10 | 2026-04-03 | `/booking/[id]` — "Book for N nights" redirects to 404 when not logged in | AMS | Fixed redirect from `/auth/login` to `/auth/guest/login` | Done |
| F11 | 2026-04-03 | `/contact` — Email accepted without proper domain (e.g. word@word) | AMS | Added regex validation requiring domain TLD | Done |

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
