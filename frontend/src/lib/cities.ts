/**
 * The one list of Saudi cities used across Hostn.
 *
 * `value` is what is stored on a property (`location.city`) and sent to the
 * search API — it must never change once listings use it. The website, the
 * host app and the guest app each keep an identical copy of this list; when
 * you add a city, add it to all three:
 *   frontend/src/lib/cities.ts
 *   host-app/src/constants/cities.ts
 *   user-app/src/constants/cities.ts
 */
export interface CityOption {
  value: string;
  en: string;
  ar: string;
}

export const CITIES: CityOption[] = [
  { value: 'Riyadh', en: 'Riyadh', ar: 'الرياض' },
  { value: 'Jeddah', en: 'Jeddah', ar: 'جدة' },
  { value: 'Mecca', en: 'Makkah', ar: 'مكة المكرمة' },
  { value: 'Madinah', en: 'Madinah', ar: 'المدينة المنورة' },
  { value: 'Dammam', en: 'Dammam', ar: 'الدمام' },
  { value: 'Khobar', en: 'Khobar', ar: 'الخبر' },
  { value: 'Dhahran', en: 'Dhahran', ar: 'الظهران' },
  { value: 'Taif', en: 'Taif', ar: 'الطائف' },
  { value: 'Abha', en: 'Abha', ar: 'أبها' },
  { value: 'Khamis Mushait', en: 'Khamis Mushait', ar: 'خميس مشيط' },
  { value: 'Al Ula', en: 'AlUla', ar: 'العلا' },
  { value: 'Tabuk', en: 'Tabuk', ar: 'تبوك' },
  { value: 'Hail', en: 'Hail', ar: 'حائل' },
  { value: 'Yanbu', en: 'Yanbu', ar: 'ينبع' },
  { value: 'Jazan', en: 'Jazan', ar: 'جازان' },
  { value: 'Najran', en: 'Najran', ar: 'نجران' },
  { value: 'Al Baha', en: 'Al Baha', ar: 'الباحة' },
  { value: 'Al Ahsa', en: 'Al Ahsa', ar: 'الأحساء' },
  { value: 'Jubail', en: 'Jubail', ar: 'الجبيل' },
  { value: 'Qatif', en: 'Qatif', ar: 'القطيف' },
  { value: 'Buraydah', en: 'Buraydah', ar: 'بريدة' },
  { value: 'Unaizah', en: 'Unaizah', ar: 'عنيزة' },
  { value: 'Al Kharj', en: 'Al Kharj', ar: 'الخرج' },
  { value: 'Diriyah', en: 'Diriyah', ar: 'الدرعية' },
  { value: 'Al Majmaah', en: 'Al Majmaah', ar: 'المجمعة' },
  { value: 'Az Zulfi', en: 'Az Zulfi', ar: 'الزلفي' },
  { value: 'Dawadmi', en: 'Dawadmi', ar: 'الدوادمي' },
  { value: 'Wadi ad-Dawasir', en: 'Wadi ad-Dawasir', ar: 'وادي الدواسر' },
  { value: 'Hafar Al Batin', en: 'Hafar Al Batin', ar: 'حفر الباطن' },
  { value: 'Al Khafji', en: 'Al Khafji', ar: 'الخفجي' },
  { value: 'Ras Tanura', en: 'Ras Tanura', ar: 'رأس تنورة' },
  { value: 'Arar', en: 'Arar', ar: 'عرعر' },
  { value: 'Rafha', en: 'Rafha', ar: 'رفحاء' },
  { value: 'Turaif', en: 'Turaif', ar: 'طريف' },
  { value: 'Sakaka', en: 'Sakaka', ar: 'سكاكا' },
  { value: 'Dumat Al Jandal', en: 'Dumat Al Jandal', ar: 'دومة الجندل' },
  { value: 'Qurayyat', en: 'Qurayyat', ar: 'القريات' },
  { value: 'Umluj', en: 'Umluj', ar: 'أملج' },
  { value: 'Al Wajh', en: 'Al Wajh', ar: 'الوجه' },
  { value: 'Duba', en: 'Duba', ar: 'ضباء' },
  { value: 'Rabigh', en: 'Rabigh', ar: 'رابغ' },
  { value: 'KAEC', en: 'King Abdullah Economic City', ar: 'مدينة الملك عبدالله الاقتصادية' },
  { value: 'Al Lith', en: 'Al Lith', ar: 'الليث' },
  { value: 'Al Qunfudhah', en: 'Al Qunfudhah', ar: 'القنفذة' },
  { value: 'Bisha', en: 'Bisha', ar: 'بيشة' },
  { value: 'Al Namas', en: 'Al Namas', ar: 'النماص' },
  { value: 'Tanomah', en: 'Tanomah', ar: 'تنومة' },
  { value: 'Rijal Almaa', en: 'Rijal Almaa', ar: 'رجال ألمع' },
  { value: 'Muhayil', en: 'Muhayil Asir', ar: 'محايل عسير' },
  { value: 'Sabya', en: 'Sabya', ar: 'صبيا' },
  { value: 'Abu Arish', en: 'Abu Arish', ar: 'أبو عريش' },
  { value: 'Farasan', en: 'Farasan', ar: 'جزر فرسان' },
  { value: 'Sharurah', en: 'Sharurah', ar: 'شرورة' },
  { value: 'Baljurashi', en: 'Baljurashi', ar: 'بلجرشي' },
  { value: 'Ar Rass', en: 'Ar Rass', ar: 'الرس' },
  { value: 'Shaqra', en: 'Shaqra', ar: 'شقراء' },
  { value: 'Al Muzahimiyah', en: 'Al Muzahimiyah', ar: 'المزاحمية' },
  { value: 'Thadiq', en: 'Thadiq', ar: 'ثادق' },
  { value: 'Huraymila', en: 'Huraymila', ar: 'حريملاء' },
];

/** Older spellings that may already be stored or sent by an old app build. */
export const CITY_ALIASES: Record<string, string> = {
  medina: 'Madinah',
  'al madinah': 'Madinah',
  makkah: 'Mecca',
  'al khobar': 'Khobar',
  alula: 'Al Ula',
  'al-ula': 'Al Ula',
  jizan: 'Jazan',
  'al hofuf': 'Al Ahsa',
  hofuf: 'Al Ahsa',
  'al jubail': 'Jubail',
  'hafr al batin': 'Hafar Al Batin',
  'khamis mushayt': 'Khamis Mushait',
};

/** Map any spelling (value, English label, alias, Arabic name) to the stored value. */
export function normalizeCity(input?: string | null): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const hit = CITIES.find(
    (c) => c.value.toLowerCase() === lower || c.en.toLowerCase() === lower || c.ar === raw
  );
  if (hit) return hit.value;
  return CITY_ALIASES[lower] || '';
}

/** Display name of a stored city value in the given language. */
export function cityLabel(value: string | undefined | null, lang: 'ar' | 'en'): string {
  const v = normalizeCity(value) || (value || '');
  const hit = CITIES.find((c) => c.value === v);
  return hit ? hit[lang] : value || '';
}
