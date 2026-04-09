import { SAUDI_CITIES } from './config';
import type { Language } from '../i18n';

export const DISTRICTS: Record<string, { value: string; en: string; ar: string }[]> = {
  Riyadh: [
    { value: 'Al Olaya', en: 'Al Olaya', ar: 'العليا' },
    { value: 'Al Malaz', en: 'Al Malaz', ar: 'الملز' },
    { value: 'Al Nakheel', en: 'Al Nakheel', ar: 'النخيل' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Sahafah', en: 'Al Sahafah', ar: 'الصحافة' },
    { value: 'Al Yasmin', en: 'Al Yasmin', ar: 'الياسمين' },
    { value: 'Al Murabba', en: 'Al Murabba', ar: 'المربع' },
    { value: 'Al Sulimaniyah', en: 'Al Sulimaniyah', ar: 'السليمانية' },
    { value: 'Hittin', en: 'Hittin', ar: 'حطين' },
    { value: 'Al Wurud', en: 'Al Wurud', ar: 'الورود' },
  ],
  Jeddah: [
    { value: 'Al Hamra', en: 'Al Hamra', ar: 'الحمراء' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: 'الروضة' },
    { value: 'Al Shati', en: 'Al Shati', ar: 'الشاطئ' },
    { value: 'Al Corniche', en: 'Al Corniche', ar: 'الكورنيش' },
    { value: 'Al Andalus', en: 'Al Andalus', ar: 'الأندلس' },
    { value: 'Al Zahra', en: 'Al Zahra', ar: 'الزهراء' },
    { value: 'Obhur', en: 'Obhur', ar: 'أبحر' },
    { value: 'Al Khalidiyyah', en: 'Al Khalidiyyah', ar: 'الخالدية' },
  ],
  Dammam: [
    { value: 'Al Faisaliyah', en: 'Al Faisaliyah', ar: 'الفيصلية' },
    { value: 'Al Shati', en: 'Al Shati', ar: 'الشاطئ' },
    { value: 'Al Khobar', en: 'Al Khobar', ar: 'الخبر' },
    { value: 'Al Rakah', en: 'Al Rakah', ar: 'الراكة' },
  ],
  Mecca: [
    { value: 'Al Aziziyyah', en: 'Al Aziziyyah', ar: 'العزيزية' },
    { value: 'Al Shoqiyah', en: 'Al Shoqiyah', ar: 'الشوقية' },
  ],
  Abha: [
    { value: 'Al Mahalah', en: 'Al Mahalah', ar: 'المحالة' },
  ],
};

export function translateDistrict(district: string, city: string, language: Language): string {
  if (language !== 'ar') return district;
  const cityDistricts = DISTRICTS[city] || [];
  const found = cityDistricts.find(d =>
    d.value.toLowerCase() === district.toLowerCase() ||
    d.en.toLowerCase() === district.toLowerCase()
  );
  return found?.ar || district;
}

export function translateCity(city: string, language: Language): string {
  if (language !== 'ar') return city;
  const found = SAUDI_CITIES.find(c =>
    c.name.toLowerCase() === city.toLowerCase()
  );
  return found?.nameAr || city;
}
