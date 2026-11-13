# Static read — host-app MODIFIED tier 2 + UNTOUCHED files (subagent 3)

Source: subagent a7e366ca completed 2026-05-01.
Branch: feat/user-app-feature-parity HEAD ad163d5.
Files (~39): legal/{contact,terms}, messages/{[id],index,support}, notifications/index, profile/{edit,index}, reviews/{index,reply/[id]}, settings/{index,booking-rules,managers,vat}, NpsSurveyModal, StatusBadge, host.service.ts, socket.ts, format.ts, (auth)/{onboarding,phone-entry,phone-login,otp-verify}, invoices/*, financial/{payment-method,transfer-duration}, permits, protection, program, suggestions, content/*.

| # | Sev | Type | Screen / element | Reproduction | File:line | Notes |
|---|-----|------|------------------|--------------|-----------|-------|
| 1 | blocker | crash-prone | onboarding | If `MODULES` empty or `currentStep` out of range, `currentModule.id` derefs undefined | `host-app/src/app/(auth)/onboarding.tsx:117` | `MODULES[currentStep]` not guarded |
| 2 | major | crash-prone | program | `indicators[key]` on possibly array; defensive `data?.data \|\| data \|\| {}` works but not type-safe | `host-app/src/app/program/index.tsx:305` | |
| 3 | major | wrong-destination | profile/index → "قيمنا" card | Tap "قيمنا" opens `https://apps.apple.com` | `host-app/src/app/profile/index.tsx:61` | Hard-coded App Store URL |
| 4 | major | dead-end | onboarding "register" button | Tap "تسجيل" → "سيتم إطلاق التسجيل قريباً" alert | `host-app/src/app/(auth)/phone-entry.tsx:29` | Coming-soon |
| 5 | major | dead-end | protection/index — Action buttons | Both CTAs `// Future: …` no-ops | `host-app/src/app/protection/index.tsx:131,140` | Two dead pressables |
| 6 | major | dead-end | permits "أضف التصريح" | Tap → alert "هذه الميزة قيد التطوير" | `host-app/src/app/permits/index.tsx:51` | Coming-soon |
| 7 | major | dead-end | permits info banner | TouchableOpacity wraps banner, no `onPress` set | `host-app/src/app/permits/index.tsx:118` | Banner pressable but inert |
| 8 | major | crash-prone | reviews/reply/[id] — replyMutation | `id!` non-null assertion; deep-link with no id → mutation fires with empty path → 404 | `host-app/src/app/reviews/reply/[id].tsx:56` | |
| 9 | major | i18n / coverage | profile/edit | All labels/alerts hardcoded Arabic | `host-app/src/app/profile/edit.tsx:46-55,89-129` | |
| 10 | major | i18n / coverage | settings/index | Hard-coded Arabic | `host-app/src/app/settings/index.tsx:18-34,47,52-66` | |
| 11 | major | i18n / coverage | settings/{booking-rules,managers,vat} | All Arabic literals | `host-app/src/app/settings/booking-rules.tsx, managers.tsx, vat.tsx` | |
| 12 | major | i18n / coverage | invoices/* (index, [id], statements, statement-detail, summary) | All Arabic | `host-app/src/app/invoices/*` | |
| 13 | major | i18n / coverage | financial/{payment-method, transfer-duration} | Arabic hard-coded | `host-app/src/app/financial/*` | |
| 14 | major | i18n / coverage | reviews/{index, reply/[id]} | Headers/alerts Arabic-only | `host-app/src/app/reviews/index.tsx:200; reply/[id].tsx:63,99` | |
| 15 | major | i18n / coverage | content/{articles, change-requests, complaints, discount-codes, referrals} | Arabic-only | `host-app/src/app/content/*` | |
| 16 | major | i18n / coverage | program | Arabic strings only | `host-app/src/app/program/index.tsx:45-82,98` | |
| 17 | major | i18n / coverage | suggestions, protection, permits | Arabic-only | `host-app/src/app/suggestions/index.tsx; protection/index.tsx; permits/index.tsx` | |
| 18 | major | i18n / coverage | (auth)/otp-verify | Mostly hardcoded Arabic, alerts Arabic-only | `host-app/src/app/(auth)/otp-verify.tsx:110,113-117,153,160` | |
| 19 | major | i18n / coverage | (auth)/onboarding | Mix: t() for headings but hardcodes "حياك الله…", "تم", subtitles | `host-app/src/app/(auth)/onboarding.tsx:124,182,186` | |
| 20 | major | i18n / coverage | (auth)/phone-login | t() partial; placeholder/error fallbacks Arabic | `host-app/src/app/(auth)/phone-login.tsx:38,49` | |
| 21 | major | i18n / coverage | legal/{contact, terms} | All Arabic | `host-app/src/app/legal/contact.tsx; terms.tsx` | |
| 22 | major | i18n / coverage | notifications/index | Arabic-only filter labels and empty state | `host-app/src/app/notifications/index.tsx:31-34,140,183` | |
| 23 | major | i18n / coverage | NpsSurveyModal | All hardcoded Arabic | `host-app/src/components/notifications/NpsSurveyModal.tsx:36,42,87-134` | |
| 24 | major | data-bug | legal/contact — phone | `formattedPhone` constant `'9200 07858'` ignores backend `support.phone` | `host-app/src/app/legal/contact.tsx:29` | Always renders hard-coded phone |
| 25 | major | data-bug | legal/contact — `Linking.openURL('tel:920007858')` | Hardcoded number, ignores `support.phone` | `host-app/src/app/legal/contact.tsx:73` | |
| 26 | major | data-bug | legal/contact — hours | hours fallback strings Arabic but `support.hoursStart` could be ISO from API | `host-app/src/app/legal/contact.tsx:47` | |
| 27 | major | crash-prone | program — IndicatorCard | `thresholds[i]` in map could be undefined → NaN position | `host-app/src/app/program/index.tsx:174-178` | |
| 28 | major | data-bug | program — TermsTab | `data?.data` could be object causing `sections.map` failure when `Array.isArray` is false | `host-app/src/app/program/index.tsx:429,438` | Silent empty |
| 29 | major | nav-graph | profile/index — "قيمنا" | No internal screen for values; opens external | `host-app/src/app/profile/index.tsx:61` | |
| 30 | major | UX | settings/managers — owner card | Whole card opens edit modal even for `isOwner=true`; server probably rejects | `host-app/src/app/settings/managers.tsx:137-141` | |
| 31 | major | UX | settings/booking-rules | Modal "save" lacks unit-name pre-fill when re-editing — only add/delete, no edit | `host-app/src/app/settings/booking-rules.tsx` | Rules immutable after create |
| 32 | major | UX | settings/vat | No delete/edit; only add. Cannot remove a VAT entry | `host-app/src/app/settings/vat.tsx` | Missing destructive action |
| 33 | major | data-mismatch | StatusBadge | Falls back to `statusConfig.waiting` for unknown status — silently shows "منتظي" pill (typo) | `host-app/src/components/ui/StatusBadge.tsx:11,25` | |
| 34 | major | data-bug | host.service — getNotifications filter param | accepts `check_in/check_out/booking_confirmed` keys, but backend may use different filter field | `host-app/src/services/host.service.ts:68` | |
| 35 | major | data-bug | invoices/[id] — `invoice.lineItems.map` | Crashes if `lineItems` undefined (no `?.`) | `host-app/src/app/invoices/[id].tsx:160` | |
| 36 | major | data-bug | invoices/statement-detail — `statement.transactions.map` | No optional chaining | `host-app/src/app/invoices/statement-detail.tsx:127` | |
| 37 | major | data-bug | invoices/index | `Invoice.amount` rendered but [id] uses `totalWithTax` — possible mismatch | `host-app/src/app/invoices/index.tsx:53 vs [id].tsx:38` | |
| 38 | major | crash-prone | content/change-requests | `item.createdAt` rendered as string directly | `host-app/src/app/content/change-requests.tsx:55` | No formatDate |
| 39 | major | crash-prone | content/discount-codes | `item.createdAt` raw rendering | `host-app/src/app/content/discount-codes.tsx:95` | |
| 40 | major | crash-prone | content/articles | `item.publishedDate` raw rendering | `host-app/src/app/content/articles.tsx:70` | |
| 41 | major | data-bug | content/complaints | `item.status` raw (status pill rendered as raw key) | `host-app/src/app/content/complaints.tsx:18,49` | |
| 42 | major | UX | content/referrals | Title says "رابط الإحالة وأكواد الخصم" but discount-codes section absent | `host-app/src/app/content/referrals.tsx:59` | |
| 43 | major | UX | reviews/reply/[id] | After router.back, query invalidate runs but no toast confirms reply sent | `host-app/src/app/reviews/reply/[id].tsx:60` | |
| 44 | major | UX | profile/edit | No email format validation before mutation; allows `bad@` | `host-app/src/app/profile/edit.tsx:59` | |
| 45 | major | UX | (auth)/phone-login | Send-OTP error message Arabic-only | `host-app/src/app/(auth)/phone-login.tsx:38,49` | |
| 46 | major | data-bug | (auth)/otp-verify — login() | Stores token without `host` if `token && !host` — partial state could break later screens | `host-app/src/app/(auth)/otp-verify.tsx:54-63` | |
| 47 | major | nav-graph | (auth)/otp-verify — "تغيير الرقم" | Falls back to phone-login route, but user came from phone-entry → fallbackRoute mismatch | `host-app/src/app/(auth)/otp-verify.tsx:107` | |
| 48 | major | data-bug | services/host.service.ts — deprecated legacy methods | `getUnitLegacy`/`updateUnitLegacy`/`updateUnitPricingLegacy` still exported | `host-app/src/services/host.service.ts:13-16,111-112` | |
| 49 | major | data-bug | services/host.service.ts — `updatePaymentMethod` accepts `any` | Unsafe | `host-app/src/services/host.service.ts:53` | |
| 50 | minor | console-noise | services/socket.ts | 13 `console.log` calls in socket lifecycle | `host-app/src/services/socket.ts:20,38,42,46,51,55,60,66,75,80,85` | Production-noisy |
| 51 | minor | data-bug | services/socket.ts — booking._id | Accessed without `?.` (only logs, but bad pattern) | `host-app/src/services/socket.ts:51,56,61` | |
| 52 | minor | hard-coded copy | StatusBadge — English labels | "Pending"/"Confirmed" never localized via t() | `host-app/src/components/ui/StatusBadge.tsx:7-17` | |
| 53 | minor | hard-coded copy | StatusBadge — typo | "منتظي" should be "منتظر" | `host-app/src/components/ui/StatusBadge.tsx:11` | |
| 54 | minor | UX | (auth)/otp-verify — empty Alert title | Mixes `Alert.alert('', ...)` with empty title | `host-app/src/app/(auth)/otp-verify.tsx:86` | |
| 55 | minor | UX | messages/[id] — three-dot menu placement | `paddingTop: 100` not aligned to header on iOS notch devices | `host-app/src/app/messages/[id].tsx:448` | |
| 56 | minor | hard-coded copy | messages/support | All copy hardcoded Arabic | `host-app/src/app/messages/support.tsx:113,155` | |
| 57 | minor | UX | notifications/index — `bookingId` no-op tap | Tap on notification with no `bookingId` does nothing visually | `host-app/src/app/notifications/index.tsx:80-86` | |
| 58 | minor | UX | notifications/index — `getNextPageParam` | Returns next page even when API returned 0 items only after first non-empty — could cause infinite spinner | `host-app/src/app/notifications/index.tsx:58-60` | |
| 59 | minor | UX | notifications/index — no isError | EmptyState only when `notifications.length===0`; doesn't expose error state | `host-app/src/app/notifications/index.tsx:180` | |
| 60 | minor | UX | invoices/index — no isError | Silent empty list on backend failure | `host-app/src/app/invoices/index.tsx:73` | |
| 61 | minor | UX | invoices/statements — no isError | Same | `host-app/src/app/invoices/statements.tsx:90-101` | |
| 62 | minor | hard-coded copy | invoices/[id] — VAT 15% | "ضريبة القيمة المضافة 15%" hardcoded; VAT could vary | `host-app/src/app/invoices/[id].tsx:181` | |
| 63 | minor | hard-coded copy | settings/vat info banner | "نسبة الضريبة 15%" hardcoded | `host-app/src/app/settings/vat.tsx:115` | |
| 64 | minor | hard-coded copy | utils/format — formatCurrency | "ريال"/"SAR" hardcoded; ignores actual currency from API | `host-app/src/utils/format.ts:17` | |
| 65 | minor | UX | utils/formatPhoneDisplay | Doesn't handle `+966` followed by space | `host-app/src/utils/format.ts:32-39` | |
| 66 | minor | UX | program/IndicatorCard | `TIER_MARKER_LABELS[i]` (4 fixed) — if API sends 3 or 5 thresholds, labels misalign | `host-app/src/app/program/index.tsx:201` | |
| 67 | minor | UX | program/{Performance,Tiers,Faq,Terms}Tab | Silent empty when no data | `host-app/src/app/program/index.tsx:314-318, 359-362, 399, 438` | |
| 68 | minor | UX | content/change-requests — no isError | Silent | `host-app/src/app/content/change-requests.tsx:65` | |
| 69 | minor | UX | content/change-requests — `item.type` raw | Renders raw (e.g. "rate_change") | `host-app/src/app/content/change-requests.tsx:36` | |
| 70 | minor | UX | content/discount-codes — no confirm before disabling code via Switch | Destructive toggle | `host-app/src/app/content/discount-codes.tsx:80` | |
| 71 | minor | UX | content/referrals — copy icon vs share handler | "copy" button actually shares — wrong icon (`copy-outline`) | `host-app/src/app/content/referrals.tsx:106` | |
| 72 | minor | UX | (auth)/phone-entry — footer link | "حمل من هنا تطبيق الضيوف" looks like link (styled `footerLink`) but no onPress | `host-app/src/app/(auth)/phone-entry.tsx:51-53` | Dead pressable styling |
| 73 | minor | UX | (auth)/onboarding — handleFinishOnboarding | Outer try/catch unreachable because inner `.catch()` swallows error | `host-app/src/app/(auth)/onboarding.tsx:80-89` | |
| 74 | minor | data-bug | reviews/reply/[id] — find by id from page 1 only | Fails if review on later pages → "loading" forever then silent missing review | `host-app/src/app/reviews/reply/[id].tsx:44-53` | |
| 75 | minor | UX | suggestions — no toast on vote success/error | Silent | `host-app/src/app/suggestions/index.tsx:45-60` | |
| 76 | minor | UX | profile/index avatar | `profile?.avatar` ternary returns identical Ionicon either way | `host-app/src/app/profile/index.tsx:91-97` | Avatar image never shown |
| 77 | minor | hard-coded copy | profile/edit save alert "تم التحديث" / "حسنا" | Arabic-only | `host-app/src/app/profile/edit.tsx:46-48` | |
| 78 | minor | UX | settings/index/handleDeleteAccount | Two-step Arabic confirms — good but Arabic-only | `host-app/src/app/settings/index.tsx:51-72` | |
| 79 | minor | UX | settings/managers — pressable region | Manager card edit vs delete trash icon — no visual affordance distinguishing | `host-app/src/app/settings/managers.tsx:137` | |
| 80 | minor | UX | financial/payment-method — STC Pay no edit flow | Read-only forever | `host-app/src/app/financial/payment-method.tsx:155-177` | |
| 81 | minor | UX | financial/transfer-duration — no nav after Save | User must manually tap back | `host-app/src/app/financial/transfer-duration.tsx:64` | |
| 82 | minor | data-bug | content/articles — Linking.openURL | No URL validation; malformed URL throws unhandled rejection | `host-app/src/app/content/articles.tsx:61,72` | |
| 83 | minor | UX | content/articles — duplicate openURL | Footer "اقرأ المزيد" duplicates whole-card press | `host-app/src/app/content/articles.tsx:71-78` | |
| 84 | minor | UX | program/IndicatorCard zone | If thresholds.length<4 zone always `basic` regardless of value | `host-app/src/app/program/index.tsx:174-178` | |
| 85 | minor | UX | reviews/reply/[id] — chip overrides text | Building `replyText` from chips overwrites user-typed custom text | `host-app/src/app/reviews/reply/[id].tsx:67-87` | |
| 86 | minor | UX | suggestions Modal — stale text | Closing modal does not reset `newSuggestion` | `host-app/src/app/suggestions/index.tsx:204` | |
| 87 | minor | hard-coded copy | utils/format | `"K"` thousand suffix not Arabic-localized | `host-app/src/utils/format.ts:23` | |
| 88 | minor | console-noise | messages/[id] — silent fetch fail | `.catch(() => {})` | `host-app/src/app/messages/[id].tsx:67` | |

## Patterns

The dominant defect class is **i18n coverage**: nearly every host-app screen is hardcoded Arabic with no `t()` usage despite `t()`/`getLocale()` infrastructure existing. Only `messages/[id].tsx` and a couple of auth screens partially use it. Bilingual support would require near-total rewrites of legal/, settings/, invoices/, financial/, content/, profile/, reviews/, suggestions/, protection/, permits/, program/, notifications/, NpsSurveyModal, and StatusBadge.

The second pattern is **dead-end CTAs and "coming soon" alerts**: phone-entry register, permits add+banner, protection claims/terms, profile/index "values" → App Store. Third is **silent empty/error coverage gaps**: invoices/index, statements, change-requests, notifications, suggestions and program tabs all skip `isError`. Fourth is **status-key leakage**: change-requests renders raw `item.type`, complaints renders raw `item.status`, StatusBadge falls back to typoed Arabic label "منتظي". Fifth, **socket.ts** is noisy with 13 console.log calls plus unsafe `booking._id` access. Sixth, **service layer typing** exposes deprecated `*Legacy` methods and uses `any` for payment-method update payloads. legal/contact ignores fetched `support.phone` (hard-coded `'920007858'`); reviews/reply/[id] fetches only page 1 to find one review by id.
