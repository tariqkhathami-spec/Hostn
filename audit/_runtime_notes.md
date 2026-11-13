# Host-app runtime walkthrough notes

Branch: feat/user-app-feature-parity HEAD ad163d5
Device: iPhone 17 Pro Simulator (iOS 26.4)
Build: Debug, BUILD SUCCEEDED, 0 errors / 3 build warnings
TS check: 0 errors
Walkthrough start: 2026-05-01 ~20:08 PT

## Path driven

1. App boot → welcome screen (phone-entry)
2. Tap **Login** outline button → phone-login screen
3. Enter `500000003` via on-screen keypad — KEYPAD ENTERS Arabic-Indic digits (٥٠٠٠٠٠٠٠٣). Tap login button → submit silently fails / no error toast / user is stuck.
   - **HR1** [blocker] phone-login digits are entered as Arabic-Indic; login mutation rejects but no error feedback. User cannot tell why login isn't progressing. (`(auth)/phone-login.tsx` form input does not normalise digits + no error UI). Confirmed by user during walkthrough.
4. (User logged in for me — bypass keypad issue using HW keyboard route)
5. Lands on Dashboard (`(tabs)/dashboard`).

## Dashboard observations

Layout (RTL):
- Header: "لوحة المعلومات" with bell icon (top-left), gear icon (top-right)
- Card "لوحة البيانات" — subtitle "تقرير أداء أسبوع 1/5/2026"
  - **HR2** [minor] date format "1/5/2026" — ambiguous DD/MM vs MM/DD; user-app convention uses Arabic month names. host-app/(tabs)/dashboard.tsx:145-146 uses `new Date()` per render and a non-localized format.
- Section "سفير هوستن" with "الكل" link, single card "سفير اساسي" + tagline "تابع مؤشرات الأداء وارقَ إلى مستويات أعلى"
- Section "نقاط وحدتك" with card "تتحدث يومياً" + "تضاف النقاط خلال 24 ساعة من تاريخ عرض العقار"
- Three quick-action cards: ملخص الحسابات (Accounts summary) / الأسعار (Pricing) / المعاملات المالية (Financial transactions)
- Section "آخر الحجوزات" / "عرض الكل" link — **list body empty** (no row rendered, no "no bookings yet" placeholder)
  - **HR3** [minor] dashboard "Recent bookings" empty state missing — section header + "View all" link visible but body empty; no fallback text or icon. Inconsistent with rest of app.
- Tab bar: التقويم / الحجوزات / الرئيسية (active centred + raised) / العقار / المزيد

No console output visible (no Metro tail being observed in screenshot, but the build log captured only the build phase). Connectivity banner from user-app is **NOT present** here (host-app does not appear to use the same NetworkBanner component).
