/**
 * Turns any error thrown by an API call into a sentence the host can read.
 *
 * The backend answers in English (and sometimes with raw Mongoose validation
 * text). None of that may reach the screen: known messages and codes are
 * mapped to Arabic, a message the server already wrote in Arabic is shown as
 * is, and everything else falls back to a generic Arabic sentence.
 */

const GENERIC = 'حدث خطأ غير متوقع. حاول مرة أخرى.';

const CODE_MESSAGES: Record<string, string> = {
  PROPERTY_REJECTED: 'هذا العقار مرفوض من إدارة هوستن ولا يمكن عرضه حتى تُعالج الملاحظات.',
  UNIT_REQUIRED: 'هذا العقار يضم أكثر من وحدة. اختر الوحدة المطلوبة أولاً.',
  TOKEN_EXPIRED: 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
  DISCOUNT_PERCENT_REQUIRED: 'حدّد نسبة الخصم قبل تفعيله.',
  DISCOUNT_CODES_UNAVAILABLE: 'أكواد الخصم غير متاحة حالياً.',
};

// Matched against the lower-cased server message, first hit wins.
const MESSAGE_PATTERNS: [RegExp, string][] = [
  [/invalid property type/, 'نوع العقار غير صالح. اختر نوعاً من القائمة.'],
  [/title is required/, 'اسم العقار مطلوب.'],
  [/title too long/, 'اسم العقار طويل جداً (200 حرف كحد أقصى).'],
  [/city is required/, 'المدينة مطلوبة.'],
  [/invalid direction/, 'الاتجاه غير صالح. اختر اتجاهاً من القائمة.'],
  [/description too long|description.*exceed/, 'الوصف طويل جداً.'],
  [/name cannot exceed/, 'اسم الوحدة طويل جداً (200 حرف كحد أقصى).'],
  [/not authorized|not authorised|forbidden|permission/, 'ليست لديك صلاحية لتنفيذ هذا الإجراء.'],
  [/property not found/, 'لم يتم العثور على العقار. ربما تم حذفه.'],
  [/unit not found/, 'لم يتم العثور على الوحدة. ربما تم حذفها.'],
  [/no units yet/, 'لا توجد وحدات في هذا العقار بعد.'],
  [/invalid (resource|unit|property) id/, 'تعذّر العثور على العنصر المطلوب.'],
  [/no valid (fields|pricing fields)/, 'لا توجد بيانات صالحة للحفظ.'],
  [/must be a number between/, 'السعر يجب أن يكون رقماً صحيحاً لا يقل عن صفر.'],
  [/price.*must be positive/, 'السعر يجب أن يكون رقماً موجباً.'],
  [/max guests/, 'عدد الضيوف يجب أن يكون 1 على الأقل.'],
  [/is not a valid enum value/, 'إحدى القيم المختارة غير مقبولة. حدّث التطبيق أو أعد الاختيار.'],
  [/less than minimum|more than maximum|is (shorter|longer) than/, 'إحدى القيم المدخلة خارج الحد المسموح.'],
  [/cast to|validation failed|path `/, 'بعض البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.'],
  [/no file uploaded/, 'لم يتم إرفاق أي صورة.'],
  [/file too large|limit_file_size|too large/, 'حجم الصورة كبير جداً. اختر صورة أصغر.'],
  [/invalid file type|only .* (images|files)|unsupported/, 'نوع الملف غير مدعوم. استخدم صورة JPG أو PNG.'],
  [/upload failed/, 'تعذّر رفع الصورة. حاول مرة أخرى.'],
  [/already exists/, 'هذه البيانات مسجّلة مسبقاً.'],
  [/too many requests|rate limit/, 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.'],
  [/invalid token|token expired|not logged in|please log in/, 'انتهت الجلسة. سجّل الدخول مرة أخرى.'],
];

const hasArabic = (text: string) => /[؀-ۿ]/.test(text);

function fromServerMessage(message: string): string | null {
  const text = message.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [pattern, arabic] of MESSAGE_PATTERNS) {
    if (pattern.test(lower)) return arabic;
  }
  // The server already answered in Arabic (e.g. discount limits).
  if (hasArabic(text) && !/[a-z]{4,}/i.test(text)) return text;
  return null;
}

/**
 * @param error    whatever the request threw (usually an AxiosError)
 * @param fallback Arabic sentence for this action, e.g. 'تعذّر حفظ الوحدة.'
 */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  const err = error as any;
  const generic = fallback || GENERIC;
  if (!err) return generic;

  const response = err.response;

  if (!response) {
    const code = String(err.code || '');
    const message = String(err.message || '').toLowerCase();
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || message.includes('timeout')) {
      return 'انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مرة أخرى.';
    }
    if (code === 'ERR_NETWORK' || message.includes('network')) {
      return 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
    }
    return generic;
  }

  const data = response.data && typeof response.data === 'object' ? response.data : {};

  if (typeof data.code === 'string' && CODE_MESSAGES[data.code]) {
    const note = typeof data.moderationNote === 'string' ? data.moderationNote.trim() : '';
    return note && data.code === 'PROPERTY_REJECTED'
      ? `${CODE_MESSAGES[data.code]}\nملاحظة الإدارة: ${note}`
      : CODE_MESSAGES[data.code];
  }

  const candidates: string[] = [];
  if (typeof data.message === 'string') candidates.push(data.message);
  if (Array.isArray(data.errors)) {
    for (const e of data.errors) {
      if (typeof e === 'string') candidates.push(e);
      else if (e && typeof e.msg === 'string') candidates.push(e.msg);
      else if (e && typeof e.message === 'string') candidates.push(e.message);
    }
  }
  for (const candidate of candidates) {
    const mapped = fromServerMessage(candidate);
    if (mapped) return mapped;
  }

  switch (response.status) {
    case 400:
    case 422:
      return 'بعض البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.';
    case 401:
      return 'انتهت الجلسة. سجّل الدخول مرة أخرى.';
    case 403:
      return 'ليست لديك صلاحية لتنفيذ هذا الإجراء.';
    case 404:
      return 'لم يتم العثور على العنصر المطلوب.';
    case 413:
      return 'حجم الملف كبير جداً.';
    case 429:
      return 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.';
    default:
      return response.status >= 500 ? 'حدث خطأ في الخادم. حاول مرة أخرى بعد قليل.' : generic;
  }
}
