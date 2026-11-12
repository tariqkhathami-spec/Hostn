/**
 * Turn an API failure into a sentence the user can act on, in their language.
 * The API answers in English (and sometimes with raw validator text), which
 * must never be shown as-is in the Arabic interface.
 */
type Lang = 'ar' | 'en';

const KNOWN: Array<{ match: RegExp; ar: string; en?: string }> = [
  { match: /invalid property type/i, ar: 'نوع العقار غير صحيح. اختر نوعاً من القائمة.' },
  { match: /title is required/i, ar: 'اسم العقار مطلوب.' },
  { match: /title too long/i, ar: 'اسم العقار طويل جداً.' },
  { match: /city is required/i, ar: 'المدينة مطلوبة.' },
  { match: /invalid direction/i, ar: 'الاتجاه غير صحيح.' },
  { match: /not authorized, no token|token revoked|user not found/i, ar: 'انتهت جلستك. سجّل الدخول من جديد.' },
  { match: /not authorized/i, ar: 'ليست لديك صلاحية لهذا الإجراء.' },
  { match: /property not found/i, ar: 'العقار غير موجود.' },
  { match: /unit not found/i, ar: 'الوحدة غير موجودة.' },
  { match: /all units are inactive/i, ar: 'لا يمكن تفعيل العقار وكل وحداته متوقفة. فعّل وحدة واحدة على الأقل أولاً.' },
  { match: /rejected by the admin/i, ar: 'هذا العقار مرفوض من الإدارة ولا يمكن عرضه حتى تتم الموافقة عليه.' },
  { match: /file too large/i, ar: 'حجم الملف كبير. الحد الأقصى 5 ميجابايت للصورة.' },
  { match: /only .*(images|jpg|jpeg|png)/i, ar: 'نوع الملف غير مدعوم. ارفع صورة JPG أو PNG أو WebP.' },
  { match: /is not a valid enum value/i, ar: 'إحدى القيم المختارة غير مقبولة. حدّث الصفحة وحاول مرة أخرى.' },
  { match: /validation failed/i, ar: 'بعض البيانات غير مكتملة أو غير صحيحة. راجع الحقول وحاول مرة أخرى.' },
  { match: /not available for booking yet/i, ar: 'هذا المكان غير متاح للحجز حالياً.' },
  { match: /too many requests/i, ar: 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.' },
];

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string; errors?: unknown } };
  code?: string;
  message?: string;
}

export function apiErrorText(err: unknown, lang: Lang, fallback: string): string {
  const e = err as ApiErrorShape;
  const data = e?.response?.data;

  // Collect whatever the server said.
  let serverText = '';
  if (data?.errors) {
    const errs = data.errors as unknown;
    const first = Array.isArray(errs) ? errs[0] : Object.values(errs as Record<string, unknown>)[0];
    if (typeof first === 'string') serverText = first;
    else if (first && typeof first === 'object' && 'message' in first) serverText = String((first as { message: unknown }).message);
  }
  if (!serverText && data?.message) serverText = data.message;

  if (!e?.response) {
    return lang === 'ar'
      ? 'تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.'
      : 'Could not reach the server. Check your connection and try again.';
  }

  if (lang === 'en') return serverText || fallback;

  const known = KNOWN.find((k) => k.match.test(serverText));
  if (known) return known.ar;
  // Arabic text from the server can be shown; anything else falls back.
  if (/[؀-ۿ]/.test(serverText)) return serverText;
  return fallback;
}
