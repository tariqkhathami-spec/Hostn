'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { unitsApi } from '@/lib/api';
import {
  Users, Bed, Bath, Droplets, ChevronDown, ChevronUp,
  Waves, UtensilsCrossed, Sofa, Shield, Loader2, Layers,
} from 'lucide-react';
import SarSymbol from '@/components/ui/SarSymbol';

/* ─── Translations ────────────────────────────────────────────────── */
const t: Record<string, Record<string, string>> = {
  title:        { en: 'Available Units', ar: 'الوحدات المتاحة' },
  guests:       { en: 'Guests', ar: 'ضيوف' },
  bedrooms:     { en: 'Bedrooms', ar: 'غرف نوم' },
  bathrooms:    { en: 'Bathrooms', ar: 'حمامات' },
  avgPrice:     { en: 'avg/night', ar: 'متوسط/ليلة' },
  moreDetails:  { en: 'More details', ar: 'تفاصيل أكثر' },
  lessDetails:  { en: 'Less', ar: 'أقل' },
  area:         { en: 'Area', ar: 'المساحة' },
  sqm:          { en: 'm²', ar: 'م²' },
  suitFamily:   { en: 'Families', ar: 'عائلات' },
  suitSingles:  { en: 'Singles', ar: 'أفراد' },
  suitBoth:     { en: 'Everyone', ar: 'الجميع' },
  deposit:      { en: 'Deposit', ar: 'عربون' },
  insurance:    { en: 'Insurance on arrival', ar: 'تأمين عند الوصول' },
  cancelFree:   { en: 'Free cancellation', ar: 'إلغاء مجاني' },
  cancelFlex:   { en: 'Flexible cancellation', ar: 'إلغاء مرن' },
  cancelNorm:   { en: 'Standard cancellation', ar: 'إلغاء عادي' },
  cancelRestr:  { en: 'Restricted cancellation', ar: 'إلغاء مقيد' },
  pools:        { en: 'Pools', ar: 'مسابح' },
  kitchen:      { en: 'Kitchen', ar: 'مطبخ' },
  livingRooms:  { en: 'Living rooms', ar: 'غرف معيشة' },
  noUnits:      { en: 'No units available for this property', ar: 'لا توجد وحدات متاحة لهذا العقار' },
  loading:      { en: 'Loading units...', ar: 'جاري تحميل الوحدات...' },
  singleBeds:   { en: 'Single', ar: 'فردي' },
  doubleBeds:   { en: 'Double', ar: 'مزدوج' },
  perNight:     { en: '/night', ar: '/ليلة' },
};

/* ─── Amenity / feature labels ─────────────────────────────────────── */
const LABEL: Record<string, { en: string; ar: string }> = {
  // amenities
  tv: { en: 'TV', ar: 'تلفزيون' }, balcony: { en: 'Balcony', ar: 'شرفة' }, outdoor_seating: { en: 'Outdoor Seating', ar: 'جلسة خارجية' },
  green_area: { en: 'Green Area', ar: 'مسطحات خضراء' }, bbq_area: { en: 'BBQ', ar: 'شواء' }, fire_pit: { en: 'Fire Pit', ar: 'حفرة نار' },
  speakers: { en: 'Speakers', ar: 'سماعات' }, projector: { en: 'Projector', ar: 'بروجكتر' }, slide: { en: 'Slide', ar: 'زحليقة' },
  kids_playground: { en: 'Playground', ar: 'ملعب أطفال' }, cinema_room: { en: 'Cinema', ar: 'سينما' }, billiards: { en: 'Billiards', ar: 'بلياردو' },
  trampoline: { en: 'Trampoline', ar: 'ترامبولين' }, playstation: { en: 'PlayStation', ar: 'بلايستيشن' }, volleyball: { en: 'Volleyball', ar: 'كرة طائرة' },
  basketball: { en: 'Basketball', ar: 'كرة سلة' }, football: { en: 'Football', ar: 'كرة قدم' }, table_tennis: { en: 'Table Tennis', ar: 'تنس طاولة' },
  massage_chairs: { en: 'Massage Chairs', ar: 'كراسي مساج' }, zipline: { en: 'Zipline', ar: 'زيبلاين' }, bridal_room: { en: 'Bridal Room', ar: 'غرفة عروس' },
  sand_games: { en: 'Sand Games', ar: 'ألعاب رملية' }, sand_skiing: { en: 'Sand Skiing', ar: 'تزلج رمال' },
  two_sections: { en: 'Two Sections', ar: 'قسمين' }, two_separate_sections: { en: 'Two Separate', ar: 'قسمين منفصلين' },
  two_sections_connected: { en: 'Two Connected', ar: 'قسمين متصلين' }, womens_pool: { en: "Women's Pool", ar: 'مسبح نسائي' },
  outdoor_annex: { en: 'Outdoor Annex', ar: 'ملحق خارجي' }, tent: { en: 'Tent', ar: 'خيمة' }, dining_hall: { en: 'Dining Hall', ar: 'قاعة طعام' },
  drivers_room: { en: "Driver's Room", ar: 'غرفة سائق' }, luxury_salon: { en: 'Luxury Salon', ar: 'صالون فاخر' }, hair_salon: { en: 'Hair Salon', ar: 'صالون تجميل' },
  shared_pool: { en: 'Shared Pool', ar: 'مسبح مشترك' }, lit_pool: { en: 'Lit Pool', ar: 'مسبح مضاء' }, mist_fan: { en: 'Mist Fan', ar: 'مروحة رذاذ' },
  extra_lighting: { en: 'Extra Lighting', ar: 'إضاءة إضافية' },
  // features
  internet: { en: 'Internet', ar: 'إنترنت' }, parking: { en: 'Parking', ar: 'موقف' }, elevator: { en: 'Elevator', ar: 'مصعد' },
  self_checkin: { en: 'Self Check-in', ar: 'دخول ذاتي' }, cleaning: { en: 'Cleaning', ar: 'تنظيف' }, security_office: { en: 'Security', ar: 'حراسة' },
  workspace: { en: 'Workspace', ar: 'مساحة عمل' }, wardrobe: { en: 'Wardrobe', ar: 'خزانة' }, personal_care: { en: 'Personal Care', ar: 'عناية شخصية' },
  mountain_view: { en: 'Mountain View', ar: 'إطلالة جبلية' }, sea_view: { en: 'Sea View', ar: 'إطلالة بحرية' }, garden_view: { en: 'Garden View', ar: 'إطلالة حديقة' },
  mountain_waterfall: { en: 'Waterfall', ar: 'شلال' }, private_beach: { en: 'Private Beach', ar: 'شاطئ خاص' },
  // pool types
  inside_with_barrier: { en: 'Indoor (fenced)', ar: 'داخلي مسيّج' }, inside_without_barrier: { en: 'Indoor', ar: 'داخلي' },
  outside_with_barrier: { en: 'Outdoor (fenced)', ar: 'خارجي مسيّج' }, outside_without_barrier: { en: 'Outdoor', ar: 'خارجي' },
  waterpark_with_barrier: { en: 'Waterpark (fenced)', ar: 'مائية مسيّجة' }, waterpark_without_barrier: { en: 'Waterpark', ar: 'حديقة مائية' },
  heated: { en: 'Heated', ar: 'مُدفأ' },
  // kitchen amenities
  equipped_kitchen: { en: 'Equipped', ar: 'مجهز' }, refrigerator: { en: 'Fridge', ar: 'ثلاجة' }, freezer: { en: 'Freezer', ar: 'فريزر' },
  furnace: { en: 'Stove', ar: 'موقد' }, microwave: { en: 'Microwave', ar: 'مايكروويف' }, water_kettle: { en: 'Kettle', ar: 'غلاية' },
  coffee_machine: { en: 'Coffee', ar: 'قهوة' }, dishes: { en: 'Dishes', ar: 'أواني' }, washing_machine: { en: 'Washer', ar: 'غسالة' },
  // bathroom
  bath: { en: 'Bathtub', ar: 'حوض' }, shower: { en: 'Shower', ar: 'دش' }, jacuzzi: { en: 'Jacuzzi', ar: 'جاكوزي' },
  sauna: { en: 'Sauna', ar: 'ساونا' }, tissues: { en: 'Tissues', ar: 'مناديل' }, soap: { en: 'Soap', ar: 'صابون' },
  shampoo: { en: 'Shampoo', ar: 'شامبو' }, slippers: { en: 'Slippers', ar: 'شباشب' }, robe: { en: 'Robe', ar: 'روب' },
};

const lbl = (key: string, lang: string) => LABEL[key]?.[lang as 'en' | 'ar'] || key;

/* ─── Types ────────────────────────────────────────────────────────── */
interface PoolInfo { type: string; variableDepth?: boolean; depthMin?: number; depthMax?: number; depth?: number; lengthM?: number; widthM?: number }
interface UnitData {
  _id: string;
  nameEn?: string; nameAr?: string; name?: string;
  description?: string; area?: number; suitability?: string;
  depositPercent?: number; insuranceOnArrival?: boolean; insuranceAmount?: number;
  cancellationPolicy?: string;
  images?: { url: string; isPrimary?: boolean }[];
  capacity?: { maxGuests?: number };
  bedrooms?: { count?: number; singleBeds?: number; doubleBeds?: number };
  hasBedrooms?: boolean; bathroomCount?: number;
  bathroomAmenities?: string[];
  hasLivingRooms?: boolean;
  livingRooms?: { main?: number; additional?: number; outdoor?: number; outdoorRoom?: number };
  hasKitchen?: boolean;
  kitchen?: { diningCapacity?: number; amenities?: string[] };
  hasPool?: boolean; pools?: PoolInfo[];
  amenities?: string[]; features?: string[];
  pricing?: Record<string, number>;
}

/* ─── Component ────────────────────────────────────────────────────── */
export default function UnitsList({ propertyId }: { propertyId: string }) {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [units, setUnits] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    unitsApi.getForProperty(propertyId)
      .then((res) => setUnits(res.data.data || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> {t.loading[lang]}
      </div>
    );
  }

  if (loadError || units.length === 0) return null; // Don't show section if no units or load failed

  const avgPrice = (pricing?: Record<string, number>) => {
    if (!pricing) return 0;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const prices = days.map((d) => pricing[d] || 0).filter((p) => p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };

  const unitName = (u: UnitData) =>
    (isAr ? u.nameAr || u.nameEn : u.nameEn || u.nameAr) || (isAr ? 'وحدة' : 'Unit');

  const primaryImg = (u: UnitData) =>
    u.images?.find((i) => i.isPrimary)?.url || u.images?.[0]?.url;

  const suitLabel = (s?: string) =>
    s === 'family' ? t.suitFamily[lang] : s === 'singles' ? t.suitSingles[lang] : t.suitBoth[lang];

  const cancelLabel = (p?: string) => {
    const map: Record<string, Record<string, string>> = { free: t.cancelFree, flexible: t.cancelFlex, normal: t.cancelNorm, restricted: t.cancelRestr };
    return map[p || 'flexible']?.[lang] || p;
  };

  const totalLivingRooms = (lr?: UnitData['livingRooms']) =>
    (lr?.main || 0) + (lr?.additional || 0) + (lr?.outdoor || 0) + (lr?.outdoorRoom || 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-primary-600" />
        {t.title[lang]} <span className="text-base font-normal text-gray-400">({units.length})</span>
      </h2>

      <div className="space-y-4">
        {units.map((unit) => {
          const isExp = expanded === unit._id;
          const price = avgPrice(unit.pricing);

          return (
            <div key={unit._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary-200 transition-colors">
              {/* ── Collapsed card ── */}
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                {primaryImg(unit) && (
                  <div className="sm:w-44 h-36 sm:h-auto flex-shrink-0">
                    <img src={primaryImg(unit)} alt={unitName(unit)} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{unitName(unit)}</h3>
                      {price > 0 && (
                        <div className="text-end flex-shrink-0">
                          <p className="text-lg font-bold text-primary-600">
                            <span dir="ltr"><SarSymbol /> {price.toLocaleString('en')}</span>
                          </p>
                          <p className="text-xs text-gray-400">{t.avgPrice[lang]}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick stats */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      {(unit.capacity?.maxGuests ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {unit.capacity!.maxGuests} {t.guests[lang]}</span>
                      )}
                      {unit.hasBedrooms && (unit.bedrooms?.count ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /> {unit.bedrooms!.count} {t.bedrooms[lang]}</span>
                      )}
                      {(unit.bathroomCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {unit.bathroomCount} {t.bathrooms[lang]}</span>
                      )}
                      {unit.area && (
                        <span className="flex items-center gap-1">{unit.area} {t.sqm[lang]}</span>
                      )}
                      {unit.hasPool && (unit.pools?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Waves className="w-3.5 h-3.5 text-blue-500" /> {unit.pools!.length} {t.pools[lang]}</span>
                      )}
                      {unit.hasKitchen && (
                        <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> {t.kitchen[lang]}</span>
                      )}
                      {unit.hasLivingRooms && totalLivingRooms(unit.livingRooms) > 0 && (
                        <span className="flex items-center gap-1"><Sofa className="w-3.5 h-3.5" /> {totalLivingRooms(unit.livingRooms)} {t.livingRooms[lang]}</span>
                      )}
                    </div>

                    {/* Top features/amenities tags */}
                    {((unit.features?.length ?? 0) > 0 || (unit.amenities?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[...(unit.features || []).slice(0, 4), ...(unit.amenities || []).slice(0, 3)].map((key) => (
                          <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{lbl(key, lang)}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(isExp ? null : unit._id)}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3 self-start"
                  >
                    {isExp ? t.lessDetails[lang] : t.moreDetails[lang]}
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ── Expanded details ── */}
              {isExp && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4 text-sm">
                  {/* Description */}
                  {unit.description && (
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{unit.description}</p>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <InfoItem label={isAr ? 'مناسبة لـ' : 'Suitable for'} value={suitLabel(unit.suitability)} />
                    <InfoItem label={isAr ? 'سياسة الإلغاء' : 'Cancellation'} value={cancelLabel(unit.cancellationPolicy) || ''} />
                    {(unit.depositPercent ?? 0) > 0 && <InfoItem label={t.deposit[lang]} value={`${unit.depositPercent}%`} />}
                    {unit.insuranceOnArrival && <InfoItem label={t.insurance[lang]} value={`${unit.insuranceAmount || 0} SAR`} />}
                  </div>

                  {/* Bedrooms detail */}
                  {unit.hasBedrooms && (unit.bedrooms?.singleBeds || unit.bedrooms?.doubleBeds) && (
                    <div className="flex items-center gap-4 text-gray-600">
                      <Bed className="w-4 h-4 text-gray-400" />
                      {(unit.bedrooms.singleBeds ?? 0) > 0 && <span>{unit.bedrooms.singleBeds} {t.singleBeds[lang]}</span>}
                      {(unit.bedrooms.doubleBeds ?? 0) > 0 && <span>{unit.bedrooms.doubleBeds} {t.doubleBeds[lang]}</span>}
                    </div>
                  )}

                  {/* Bathroom amenities */}
                  {(unit.bathroomAmenities?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{isAr ? 'مستلزمات الحمام' : 'Bathroom amenities'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.bathroomAmenities!.map((a) => (
                          <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{lbl(a, lang)}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kitchen amenities */}
                  {unit.hasKitchen && (unit.kitchen?.amenities?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{t.kitchen[lang]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.kitchen!.amenities!.map((a) => (
                          <span key={a} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{lbl(a, lang)}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pools detail */}
                  {unit.hasPool && (unit.pools?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{t.pools[lang]}</p>
                      <div className="space-y-2">
                        {unit.pools!.map((pool, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-3 text-xs text-gray-600 bg-cyan-50 rounded-lg px-3 py-2">
                            <Waves className="w-3.5 h-3.5 text-cyan-600" />
                            <span className="font-medium">{lbl(pool.type, lang)}</span>
                            {pool.lengthM && pool.widthM && <span>{pool.lengthM}×{pool.widthM}m</span>}
                            {pool.variableDepth
                              ? pool.depthMin && pool.depthMax && <span>{pool.depthMin}-{pool.depthMax}m</span>
                              : pool.depth && <span>{pool.depth}m</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All amenities */}
                  {(unit.amenities?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{isAr ? 'المرافق' : 'Amenities'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.amenities!.map((a) => (
                          <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{lbl(a, lang)}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All features */}
                  {(unit.features?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{isAr ? 'الميزات' : 'Features'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.features!.map((f) => (
                          <span key={f} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{lbl(f, lang)}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day-by-day pricing */}
                  {unit.pricing && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{isAr ? 'الأسعار حسب اليوم' : 'Daily pricing'}</p>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {[
                          { key: 'sunday', l: { en: 'Sun', ar: 'أحد' } },
                          { key: 'monday', l: { en: 'Mon', ar: 'إثن' } },
                          { key: 'tuesday', l: { en: 'Tue', ar: 'ثلا' } },
                          { key: 'wednesday', l: { en: 'Wed', ar: 'أرب' } },
                          { key: 'thursday', l: { en: 'Thu', ar: 'خمي' } },
                          { key: 'friday', l: { en: 'Fri', ar: 'جمع' } },
                          { key: 'saturday', l: { en: 'Sat', ar: 'سبت' } },
                        ].map(({ key, l }) => (
                          <div key={key} className="text-center bg-white border border-gray-100 rounded-lg px-1 py-2">
                            <p className="text-[10px] text-gray-400 mb-0.5">{l[lang as 'en' | 'ar']}</p>
                            <p className="text-xs font-semibold text-gray-700" dir="ltr">
                              {(unit.pricing![key] || 0) > 0 ? unit.pricing![key].toLocaleString('en') : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {(unit.pricing.cleaningFee ?? 0) > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {isAr ? 'رسوم التنظيف' : 'Cleaning fee'}: <span dir="ltr"><SarSymbol /> {unit.pricing.cleaningFee.toLocaleString('en')}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Gallery */}
                  {(unit.images?.length ?? 0) > 1 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {unit.images!.map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Small helper component ───────────────────────────────────────── */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}
